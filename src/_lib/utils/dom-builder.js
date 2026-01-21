import { memoize } from "#toolkit/fp/memoize.js";
import { filterObject, mapEntries } from "#toolkit/fp/object.js";
import { frozenSet } from "#toolkit/fp/set.js";
import { loadDOM } from "#utils/lazy-dom.js";

/** @typedef {import("#lib/types").ElementAttributes} ElementAttributes */

/**
 * HTML5 void elements that cannot have children and are self-closing.
 * @type {ReadonlySet<string>}
 */
const VOID_ELEMENTS = frozenSet([
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

/** Filter out null and undefined attribute values */
const filterDefinedAttrs = filterObject((_k, v) => v != null);

/**
 * Format attributes object into HTML attribute string
 * @param {ElementAttributes} attributes - Attributes to format
 * @returns {string} Formatted attribute string (with leading space if non-empty)
 */
const formatAttributes = (attributes) => {
  const parts = mapEntries(
    (key, value) => `${key}="${escapeAttrValue(value)}"`,
  )(filterDefinedAttrs(attributes));
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
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
  for (const [key, value] of Object.entries(filterDefinedAttrs(attributes))) {
    element.setAttribute(key, value);
  }
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
 * Create an element and return its HTML string.
 * Uses fast string concatenation (no DOM loading required).
 * @param {string} tagName - The tag name
 * @param {ElementAttributes} [attributes={}] - Key-value pairs of attributes
 * @param {string | null} [children=null] - Inner HTML content
 * @returns {Promise<string>} The HTML string
 */
const createHtml = async (tagName, attributes = {}, children = null) => {
  const attrs = formatAttributes(attributes);
  if (VOID_ELEMENTS.has(tagName)) {
    return `<${tagName}${attrs}>`;
  }
  return `<${tagName}${attrs}>${children || ""}</${tagName}>`;
};

/**
 * Create a template element from a document.
 * @param {Document} doc
 * @returns {HTMLTemplateElement}
 */
const createTemplateElement = (doc) => doc.createElement("template");

/**
 * Get the first child of template content as Element.
 * @param {HTMLTemplateElement} template
 * @returns {Element | null}
 */
const getTemplateContent = (template) => template.content.firstChild;

/**
 * Parse an HTML string into a DOM element
 * @param {string} html - The HTML string to parse
 * @param {Document | null} [document=null] - Optional existing document to use
 * @returns {Promise<Element | null>} The parsed element
 */
const parseHtml = async (html, document = null) => {
  const doc = document || (await getSharedDocument());
  const template = createTemplateElement(doc);
  template.innerHTML = html;
  return getTemplateContent(template);
};

export {
  applyAttributes,
  elementToHtml,
  createHtml,
  parseHtml,
  getSharedDocument,
  VOID_ELEMENTS,
};
