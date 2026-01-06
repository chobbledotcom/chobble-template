import { loadDOM } from "#utils/lazy-dom.js";
import { createLazyLoader } from "#utils/lazy-loader.js";

// Shared DOM instance for building elements
const getSharedDocument = createLazyLoader(null, {
  init: async () => {
    const DOM = await loadDOM();
    const sharedDom = new DOM("");
    return sharedDom.window.document;
  },
});

// Apply attributes to an element
const applyAttributes = (element, attributes) => {
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  }
};

// Append children to an element
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
 * @param {Object} attributes - Key-value pairs of attributes
 * @param {string|Element|Array} children - Inner content or child elements
 * @param {Document} document - Optional existing document to use
 * @returns {Promise<Element>} The created element
 */
const createElement = async (
  tagName,
  attributes = {},
  children = null,
  document = null,
) => {
  const doc = document || (await getSharedDocument());
  const element = doc.createElement(tagName);
  applyAttributes(element, attributes);
  appendChildren(element, children);
  return element;
};

/**
 * Convert an element to its HTML string representation
 * @param {Element} element - The element to serialize
 * @returns {string} The outer HTML of the element
 */
const elementToHtml = (element) => {
  return element.outerHTML;
};

/**
 * Create an element and return its HTML string
 * @param {string} tagName - The tag name
 * @param {Object} attributes - Key-value pairs of attributes
 * @param {string|Element|Array} children - Inner content or child elements
 * @returns {Promise<string>} The HTML string
 */
const createHtml = async (tagName, attributes = {}, children = null) => {
  return elementToHtml(await createElement(tagName, attributes, children));
};

/**
 * Parse an HTML string into a DOM element
 * @param {string} html - The HTML string to parse
 * @param {Document} document - Optional existing document to use
 * @returns {Promise<Element>} The parsed element
 */
const parseHtml = async (html, document = null) => {
  const doc = document || (await getSharedDocument());
  const template = doc.createElement("template");
  template.innerHTML = html;
  return template.content.firstChild;
};

export {
  createElement,
  elementToHtml,
  createHtml,
  parseHtml,
  getSharedDocument,
};
