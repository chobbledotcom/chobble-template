import { memoize } from "#toolkit/fp/memoize.js";
import { loadDOM } from "#utils/lazy-dom.js";

/** @typedef {import("#lib/types").ElementAttributes} ElementAttributes */
/** @typedef {import("#lib/types").ElementChildren} ElementChildren */

/**
 * HTML5 void elements that cannot have children and are self-closing
 */
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Escape a string for use in HTML attribute values
 * @param {string} value - The value to escape
 * @returns {string} The escaped value
 */
const escapeAttrValue = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Format attributes object into HTML attribute string
 * @param {ElementAttributes} attributes - Attributes to format
 * @returns {string} Formatted attribute string (with leading space if non-empty)
 */
const formatAttributes = (attributes) => {
  const parts = [];
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== null && value !== undefined) {
      parts.push(`${key}="${escapeAttrValue(value)}"`);
    }
  }
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
};

/**
 * Create HTML string using fast string concatenation (no DOM)
 * @param {string} tagName - The tag name
 * @param {ElementAttributes} attributes - Key-value pairs of attributes
 * @param {string | null} children - Inner HTML content (must be string or null)
 * @returns {string} The HTML string
 */
const createHtmlFast = (tagName, attributes, children) => {
  const attrs = formatAttributes(attributes);
  if (VOID_ELEMENTS.has(tagName)) {
    return `<${tagName}${attrs}>`;
  }
  return `<${tagName}${attrs}>${children || ""}</${tagName}>`;
};

/**
 * Get shared DOM document instance for building elements
 * @returns {Promise<Document>} Shared document instance
 */
const getSharedDocument = memoize(async () => {
  const dom = await loadDOM("");
  return dom.window.document;
});

/**
 * Apply attributes to an element
 * @param {HTMLElement} element - Element to modify
 * @param {ElementAttributes} attributes - Attributes to apply
 * @returns {void}
 */
const applyAttributes = (element, attributes) => {
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  }
};

/**
 * Append children to an element
 * @param {HTMLElement} element - Element to modify
 * @param {ElementChildren} children - Children to append
 * @returns {void}
 */
const appendChildren = (element, children) => {
  if (children === null) return;
  if (typeof children === "string") {
    element.innerHTML = children;
  }
};

/**
 * Create an HTML element with attributes and optional children
 * @param {string} tagName - The tag name (e.g., 'div', 'img')
 * @param {ElementAttributes} [attributes={}] - Key-value pairs of attributes
 * @param {ElementChildren} [children=null] - Inner content or child elements
 * @param {Document | null} [document=null] - Optional existing document to use
 * @returns {Promise<HTMLElement>} The created element
 */
const buildElement = async (
  tagName,
  attributes = {},
  children = null,
  document = null,
) => {
  const doc = document || (await getSharedDocument());
  /** @type {HTMLElement} */
  const element = /** @type {HTMLElement} */ (doc.createElement(tagName));
  applyAttributes(element, attributes);
  appendChildren(element, children);
  return element;
};

/**
 * Convert an element to its HTML string representation
 * @param {HTMLElement} element - The element to serialize
 * @returns {string} The outer HTML of the element
 */
const elementToHtml = (element) => {
  return element.outerHTML;
};

/**
 * Create an element and return its HTML string
 * Uses fast string concatenation when children is a string or null,
 * falls back to DOM manipulation for complex cases.
 * @param {string} tagName - The tag name
 * @param {ElementAttributes} [attributes={}] - Key-value pairs of attributes
 * @param {ElementChildren} [children=null] - Inner content or child elements
 * @returns {Promise<string>} The HTML string
 */
const createHtml = async (tagName, attributes = {}, children = null) => {
  // Fast path: use string concatenation for simple cases (string or null children)
  if (children === null || typeof children === "string") {
    return createHtmlFast(tagName, attributes, /** @type {string | null} */ (children));
  }
  // Fallback to DOM for complex cases (future Element children support)
  return elementToHtml(await buildElement(tagName, attributes, children));
};

/**
 * Parse an HTML string into a DOM element
 * @param {string} html - The HTML string to parse
 * @param {Document | null} [document=null] - Optional existing document to use
 * @returns {Promise<Element | null>} The parsed element
 */
const parseHtml = async (html, document = null) => {
  const doc = document || (await getSharedDocument());
  /** @type {HTMLTemplateElement} */
  const template = /** @type {HTMLTemplateElement} */ (
    doc.createElement("template")
  );
  template.innerHTML = html;
  return /** @type {Element | null} */ (template.content.firstChild);
};

export {
  applyAttributes,
  elementToHtml,
  createHtml,
  parseHtml,
  getSharedDocument,
};
