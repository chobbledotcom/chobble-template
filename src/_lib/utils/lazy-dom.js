// Happy-dom with DOM manipulation API
// Provides a lightweight DOM implementation for server-side rendering

import { memoize } from "#utils/memoize.js";

/**
 * @typedef {import('happy-dom').Window} HappyDOMWindow
 */

/**
 * @typedef {Object} DOM
 * @property {HappyDOMWindow} window - Happy-DOM window instance
 * @property {() => string} serialize - Serialize to HTML string
 */

/**
 * Get the memoized DOM wrapper class
 * @returns {Promise<new (html?: string) => DOM>} DOM class constructor
 */
const getDOMClass = memoize(async () => {
  const { Window } = await import("happy-dom");

  // Wrapper class providing DOM document access
  return class {
    constructor(html = "") {
      this.window = new Window();
      if (html) {
        this.window.document.write(html);
      }
    }

    serialize() {
      return this.window.document.documentElement.outerHTML;
    }
  };
});

/**
 * Create a DOM instance with optional HTML content
 * @param {string} [html=""] - Initial HTML content
 * @returns {Promise<DOM>} DOM instance
 */
const loadDOM = async (html = "") => {
  const DOM = await getDOMClass();
  return new DOM(html);
};

/**
 * Transform HTML content via DOM manipulation
 * @param {string} content - HTML content to transform
 * @param {(document: *) => void} manipulate - DOM manipulation callback (receives happy-dom Document)
 * @returns {Promise<string>} Transformed HTML string
 */
const transformDOM = async (content, manipulate) => {
  const dom = await loadDOM(content);
  manipulate(dom.window.document);
  return dom.serialize();
};

export { loadDOM, transformDOM };
