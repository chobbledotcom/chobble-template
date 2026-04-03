/**
 * Client-side AES-CTR decryption for obfuscated email links.
 *
 * At build time, mailto: links are encrypted and marked with
 * data-decrypt-email. This script decrypts them using the key
 * stored in the bundle script tag's data-decrypt-key attribute.
 */
import { onReady } from "#public/utils/on-ready.js";
import {
  BITS_PER_BYTE,
  BLOCK_BYTES,
  decodeBase64,
  NONCE_BYTES,
} from "#utils/aes-base64.js";

/** @param {string} keyText @returns {Promise<CryptoKey>} */
const importKey = (keyText) =>
  window.crypto.subtle.importKey(
    "raw",
    decodeBase64(keyText),
    { name: "AES-CTR" },
    false,
    ["decrypt"],
  );

/** @param {string} inputText @param {CryptoKey} key @returns {Promise<string>} */
const decrypt = async (inputText, key) => {
  const inputBytes = decodeBase64(inputText);
  const nonceBytes = inputBytes.slice(0, NONCE_BYTES);
  const codeBytes = inputBytes.slice(NONCE_BYTES);

  const counter = new Uint8Array(BLOCK_BYTES);
  counter.set(nonceBytes);

  const plainBytes = await window.crypto.subtle.decrypt(
    {
      name: "AES-CTR",
      counter,
      length: (BLOCK_BYTES - NONCE_BYTES) * BITS_PER_BYTE,
    },
    key,
    codeBytes,
  );

  return new TextDecoder().decode(plainBytes);
};

onReady(async () => {
  const scriptTag = document.querySelector("script[data-decrypt-key]");
  if (!scriptTag) return;

  const keyText = scriptTag.getAttribute("data-decrypt-key");
  if (!keyText) return;

  if (!("subtle" in window.crypto)) return;

  const links = document.querySelectorAll("a[data-decrypt-email]");
  if (links.length === 0) return;

  const key = await importKey(keyText);
  for (const link of links) {
    const [href, text] = await Promise.all([
      decrypt(link.getAttribute("href"), key),
      decrypt(link.textContent, key),
    ]);
    link.setAttribute("href", href);
    link.textContent = text;
  }
});
