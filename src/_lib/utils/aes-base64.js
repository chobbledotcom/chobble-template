/**
 * Custom Base64 encoding for AES email encryption.
 *
 * URL-safe base64 variant shared between build-time encryption (Node.js)
 * and client-side decryption (browser). No platform-specific dependencies.
 */

const NONCE_BYTES = 3;
const BLOCK_BYTES = 16;
const BITS_PER_BYTE = 8;

/**
 * The custom alphabet, indexable by symbol value: 0-9 → digits, 10-35 →
 * lowercase, 36-61 → uppercase, 62 → "_", 63 → "-". One lookup replaces the
 * value→char range if-chain.
 */
const BASE64_SYMBOLS =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";

/** @param {number} value @returns {string} */
const getSymbol = (value) => BASE64_SYMBOLS.charAt(value);

/** @param {number} code @returns {number} */
const getValue = (code) => {
  if (code === 45) return 63;
  if (code < 58) return code - 48;
  if (code < 91) return code - 29;
  if (code === 95) return 62;
  return code - 87;
};

/**
 * Encode bytes to custom base64 text.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
const encodeBase64 = (bytes) =>
  Array.from(bytes, (_, i) => {
    const r = i % 3;
    const next = i + 1 < bytes.length ? bytes[i + 1] : 0;
    if (r === 0) {
      return (
        getSymbol(bytes[i] >> 2) +
        getSymbol(((bytes[i] << 4) & 63) | (next >> 4))
      );
    }
    if (r === 1) {
      return getSymbol(((bytes[i] << 2) & 63) | (next >> 6));
    }
    return getSymbol(bytes[i] & 63);
  }).join("");

/**
 * Decode custom base64 text to bytes.
 * @param {string} text
 * @returns {Uint8Array}
 */
const decodeBase64 = (text) => {
  const values = Array.from(text, (ch) => getValue(ch.charCodeAt(0)));
  const length = Math.floor((3 * values.length) / 4);
  return Uint8Array.from({ length }, (_, j) => {
    const i = Math.floor(j / 3) * 4 + (j % 3) + 1;
    const r = 2 * (i % 4);
    return ((values[i - 1] << r) & 0xff) | (values[i] >> (6 - r));
  });
};

export { BITS_PER_BYTE, BLOCK_BYTES, decodeBase64, encodeBase64, NONCE_BYTES };
