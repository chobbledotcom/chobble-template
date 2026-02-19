// Happy-dom with DOM manipulation API
// Provides a lightweight DOM implementation for server-side rendering

import { memoize } from "#toolkit/fp/memoize.js";

/**
 * @typedef {import('happy-dom').Window} HappyDOMWindow
 */

/**
 * @typedef {Object} DOM
 * @property {HappyDOMWindow} window - Happy-DOM window instance
 * @property {() => string} serialize - Serialize to HTML string
 */

/**
 * Create a DOM instance with optional HTML content and Window options.
 * Memoizes the DOM wrapper class to avoid repeated module loading.
 * @param {string} [html=""] - Initial HTML content
 * @param {Object} [options] - Happy-DOM Window options
 * @returns {Promise<DOM>} DOM instance
 */
const getDOMClass = memoize(async () => {
  const { Window } = await import("happy-dom");
  return class {
    constructor(html = "", options = undefined) {
      this.window = new Window(options || undefined);
      this.window.SyntaxError = this.window.SyntaxError || SyntaxError;
      html && this.window.document.write(html);
    }

    serialize() {
      const { doctype, documentElement } = this.window.document;
      const doctypeString = doctype ? `<!DOCTYPE ${doctype.name}>` : "";
      return doctypeString + documentElement.outerHTML;
    }
  };
});

const loadDOM = async (html = "", options = undefined) => {
  const DOM = await getDOMClass();
  return new DOM(html, options);
};

export { loadDOM };
