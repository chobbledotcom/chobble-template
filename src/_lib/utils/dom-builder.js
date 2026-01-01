import { JSDOM } from "jsdom";

// Shared JSDOM instance for building elements
let sharedDom = null;

const getSharedDocument = () => {
  if (!sharedDom) {
    sharedDom = new JSDOM("");
  }
  return sharedDom.window.document;
};

/**
 * Create an HTML element with attributes and optional children
 * @param {string} tagName - The tag name (e.g., 'div', 'img')
 * @param {Object} attributes - Key-value pairs of attributes
 * @param {string|Element|Array} children - Inner content or child elements
 * @param {Document} document - Optional existing document to use
 * @returns {Element} The created element
 */
const createElement = (
  tagName,
  attributes = {},
  children = null,
  document = null,
) => {
  const doc = document || getSharedDocument();
  const element = doc.createElement(tagName);

  for (const [key, value] of Object.entries(attributes)) {
    if (value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  }

  if (children !== null) {
    if (typeof children === "string") {
      element.innerHTML = children;
    } else if (Array.isArray(children)) {
      for (const child of children) {
        element.appendChild(child);
      }
    } else {
      element.appendChild(children);
    }
  }

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
 * @returns {string} The HTML string
 */
const createHtml = (tagName, attributes = {}, children = null) => {
  return elementToHtml(createElement(tagName, attributes, children));
};

/**
 * Parse an HTML string into a DOM element
 * @param {string} html - The HTML string to parse
 * @param {Document} document - Optional existing document to use
 * @returns {Element} The parsed element
 */
const parseHtml = (html, document = null) => {
  const doc = document || getSharedDocument();
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
