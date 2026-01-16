import { loadDOM } from "#utils/lazy-dom.js";
import { memoize } from "#utils/memoize.js";

/** @typedef {import("#lib/types").ElementAttributes} ElementAttributes */
/** @typedef {import("#lib/types").ElementChildren} ElementChildren */

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
  } else if (Array.isArray(children)) {
    for (const child of children) {
      element.appendChild(child);
    }
  } else {
    element.appendChild(children);
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
const createElement = async (
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
 * @param {string} tagName - The tag name
 * @param {ElementAttributes} [attributes={}] - Key-value pairs of attributes
 * @param {ElementChildren} [children=null] - Inner content or child elements
 * @returns {Promise<string>} The HTML string
 */
const createHtml = async (tagName, attributes = {}, children = null) => {
  return elementToHtml(await createElement(tagName, attributes, children));
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
  createElement,
  elementToHtml,
  createHtml,
  parseHtml,
  getSharedDocument,
};
