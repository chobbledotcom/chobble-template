/**
 * Eleventy global data: AES encryption key for email obfuscation.
 *
 * Generates a single key per build. Available in templates as {{ encryptKey }}.
 * The same key is used by the encrypt-emails transform at build time
 * and by the decrypt-text.js script at runtime.
 */
import { generateKeyText } from "#utils/aes-encrypt.js";

const keyText = generateKeyText();

export default function () {
  return keyText;
}
