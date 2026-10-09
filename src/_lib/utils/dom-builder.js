import { memoize } from "#utils/fp/memoize.js";
import { filterObject, mapEntries } from "#utils/fp/object.js";
import { VOID_ELEMENTS } from "#utils/html-elements.js";
import { loadDOM } from "#utils/lazy-dom.js";

/** @typedef {import("#lib/types").ElementAttributes} ElementAttributes */

/** Filter out null attribute values */
const filterDefinedAttrs = filterObject((_k, v) => v != null);

/**
 * Get shared DOM document instance for building elements
 * @returns {Promise<Document>} Shared document instance
 */
const getSharedDocument = memoize(async () => {
  const dom = await loadDOM("");
  return dom.window.document;
});

/**
 * Create an element and return its HTML string.
 * Uses fast string concatenation (no DOM loading required).
 * @param {string} tagName - The tag name
 * @param {ElementAttributes} [attributes={}] - Key-value pairs of attributes
 * @param {string} [children=""] - Inner HTML content
 * @returns {Promise<string>} The HTML string
 */
const createHtml = async (tagName, attributes = {}, children = "") => {
  const parts = mapEntries((key, value) => {
    const escaped = String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `${key}="${escaped}"`;
  })(filterDefinedAttrs(attributes));
  const attrs = parts.length > 0 ? ` ${parts.join(" ")}` : "";
  if (VOID_ELEMENTS.has(tagName)) {
    return `<${tagName}${attrs}>`;
  }
  return `<${tagName}${attrs}>${children}</${tagName}>`;
};

/**
 * Parse an HTML string into a DOM element
 * @param {string} html - The HTML string to parse
 * @param {Document | null} [document=null] - Optional existing document to use
 * @returns {Promise<Element | null>} The parsed element
 */
const parseHtml = async (html, document = null) => {
  const doc = document || (await getSharedDocument());
  const template = doc.createElement("template");
  template.innerHTML = html;
  return template.content.firstElementChild;
};

export { createHtml, parseHtml };
