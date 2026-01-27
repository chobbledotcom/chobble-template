/**
 * Transform for adding target="_blank" to external links.
 *
 * Uses simple-html-tokenizer for efficient string-based processing,
 * avoiding DOM parsing overhead.
 */
import { transformHtml } from "#utils/html-tokenizer.js";

/**
 * Check if URL is external (http:// or https://)
 * @param {string} url
 * @returns {boolean}
 */
const isExternalUrl = (url) =>
  url.startsWith("http://") || url.startsWith("https://");

/**
 * Create new attributes array with an attribute added or updated (immutable).
 * @param {Array<[string, string, boolean]>} attributes
 * @param {string} name
 * @param {string} value
 * @returns {Array<[string, string, boolean]>}
 */
const withAttr = (attributes, name, value) => {
  const lowerName = name.toLowerCase();
  const idx = attributes.findIndex(([n]) => n.toLowerCase() === lowerName);
  const newAttr = [name, value, true];
  return idx >= 0
    ? attributes.map((attr, i) => (i === idx ? newAttr : attr))
    : [...attributes, newAttr];
};

/**
 * Add target="_blank" and rel="noopener noreferrer" to external links
 * using tokenizer-based string processing (no DOM parsing)
 * @param {string} html
 * @param {{ externalLinksTargetBlank?: boolean }} config
 * @returns {string}
 */
const addExternalLinkAttrs = (html, config) => {
  if (!config?.externalLinksTargetBlank) return html;

  return transformHtml(html, (token) => {
    if (token.type !== "StartTag" || token.tagName !== "a") return token;
    const hrefAttr = token.attributes.find(([n]) => n.toLowerCase() === "href");
    const href = hrefAttr?.[1];
    if (!href || !isExternalUrl(href)) return token;
    return {
      ...token,
      attributes: withAttr(
        withAttr(token.attributes, "target", "_blank"),
        "rel",
        "noopener noreferrer",
      ),
    };
  });
};

export { addExternalLinkAttrs, isExternalUrl };
