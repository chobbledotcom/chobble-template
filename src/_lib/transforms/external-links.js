/**
 * Transform for adding target="_blank" to external links.
 *
 * Uses simple-html-tokenizer for efficient string-based processing,
 * avoiding DOM parsing overhead.
 */
import { tokenize } from "@nfrasser/simple-html-tokenizer";

/**
 * Check if URL is external (http:// or https://)
 * @param {string} url
 * @returns {boolean}
 */
const isExternalUrl = (url) =>
  url.startsWith("http://") || url.startsWith("https://");

/**
 * Find attribute index by name (case-insensitive)
 * @param {Array<[string, string, boolean]>} attributes
 * @param {string} name
 * @returns {number}
 */
const findAttrIndex = (attributes, name) =>
  attributes.findIndex(([n]) => n.toLowerCase() === name.toLowerCase());

/**
 * Get attribute value by name
 * @param {Array<[string, string, boolean]>} attributes
 * @param {string} name
 * @returns {string | undefined}
 */
const getAttr = (attributes, name) => {
  const idx = findAttrIndex(attributes, name);
  return idx >= 0 ? attributes[idx][1] : undefined;
};

/**
 * Set attribute value, adding or updating as needed
 * @param {Array<[string, string, boolean]>} attributes
 * @param {string} name
 * @param {string} value
 */
const setAttr = (attributes, name, value) => {
  const idx = findAttrIndex(attributes, name);
  if (idx >= 0) {
    attributes[idx] = [name, value, true];
  } else {
    attributes.push([name, value, true]);
  }
};

/**
 * Generate HTML string from a single attribute
 * @param {[string, string, boolean]} attr - [name, value, isQuoted]
 * @returns {string}
 */
const generateAttr = ([name, value, isQuoted]) =>
  isQuoted ? `${name}="${value}"` : value ? `${name}=${value}` : name;

/**
 * Generate HTML for a start tag token
 * @param {object} token
 * @returns {string}
 */
const generateStartTag = (token) => {
  const attrs = token.attributes.map(generateAttr).join(" ");
  const attrStr = attrs ? ` ${attrs}` : "";
  return token.selfClosing
    ? `<${token.tagName}${attrStr} />`
    : `<${token.tagName}${attrStr}>`;
};

/** Token type to generator mapping */
const tokenGenerators = {
  Chars: (token) => token.chars,
  Comment: (token) => `<!--${token.chars}-->`,
  StartTag: generateStartTag,
  EndTag: (token) => `</${token.tagName}>`,
  Doctype: (token) => `<!DOCTYPE ${token.name}>`,
};

/**
 * Generate HTML string from tokens
 * @param {Array<object>} tokens
 * @returns {string}
 */
const generate = (tokens) => {
  let html = "";
  for (const token of tokens) {
    const generator = tokenGenerators[token.type];
    if (generator) html += generator(token);
  }
  return html;
};

/**
 * Check if a token is an external anchor tag
 * @param {object} token
 * @returns {boolean}
 */
const isExternalAnchor = (token) => {
  if (token.type !== "StartTag" || token.tagName !== "a") return false;
  const href = getAttr(token.attributes, "href");
  return href && isExternalUrl(href);
};

/**
 * Add external link attributes to a token
 * @param {object} token
 */
const addExternalAttrsToToken = (token) => {
  setAttr(token.attributes, "target", "_blank");
  setAttr(token.attributes, "rel", "noopener noreferrer");
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

  const tokens = tokenize(html);
  for (const token of tokens) {
    if (isExternalAnchor(token)) addExternalAttrsToToken(token);
  }
  return generate(tokens);
};

/**
 * Get external link attributes string for use in templates
 * @param {string} url
 * @param {boolean} targetBlank
 * @returns {string}
 */
const getExternalLinkAttrs = (url, targetBlank) =>
  targetBlank && typeof url === "string" && isExternalUrl(url)
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";

export { addExternalLinkAttrs, getExternalLinkAttrs, isExternalUrl };
