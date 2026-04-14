/**
 * DOM transform that encrypts mailto: links at build time.
 *
 * Finds all <a href="mailto:..."> elements, encrypts the href and
 * visible text, and adds a data-decrypt-link attribute so the
 * browser-side decrypt-text.js can restore them.
 */
import getEncryptKey from "#data/encryptKey.js";
import { decodeBase64, encrypt } from "#utils/aes-encrypt.js";

const keyText = getEncryptKey();
const keyBytes = decodeBase64(keyText);

/**
 * Encrypt all mailto: links in a parsed DOM document.
 * @param {*} document
 */
const encryptEmails = (document) => {
  for (const link of document.querySelectorAll('a[href^="mailto:"]')) {
    link.textContent = encrypt(link.textContent, keyBytes);
    link.setAttribute(
      "href",
      `#${encrypt(link.getAttribute("href"), keyBytes)}`,
    );
    link.setAttribute("data-decrypt-link", "");
  }
};

/**
 * Check if HTML content contains mailto: links that need encryption.
 * @param {string} content
 * @returns {boolean}
 */
const hasMailtoLinks = (content) => content.includes("mailto:");

export { encryptEmails, hasMailtoLinks };
