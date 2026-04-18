// Happy-dom with DOM manipulation API
// Provides a lightweight DOM implementation for server-side rendering

import { memoize } from "#toolkit/fp/memoize.js";

/**
 * @typedef {import('happy-dom').Window} HappyDOMWindow
 * @typedef {NonNullable<ConstructorParameters<typeof import('happy-dom').Window>[0]>} WindowOptions
 * @typedef {import('#lib/types').DOM} DOM
 */

/**
 * Default happy-dom settings for server-side rendering.
 * Only DOM querying/manipulation is needed for HTML transforms, so we disable
 * everything else: CSS/JS file loading, iframe navigation, computed styles, etc.
 * Individual callers can override via loadDOM(html, { settings: { ... } }).
 */
const SSR_SETTINGS = {
  disableCSSFileLoading: true,
  disableJavaScriptFileLoading: true,
  disableJavaScriptEvaluation: true,
  disableIframePageLoading: true,
  disableComputedStyleRendering: true,
  navigation: {
    disableMainFrameNavigation: true,
    disableChildFrameNavigation: true,
    disableChildPageNavigation: true,
  },
};

/**
 * Memoized wrapper class factory; avoids reloading happy-dom on each call.
 */
const getDOMClass = memoize(async () => {
  const { Window } = await import("happy-dom");
  return class {
    /**
     * @param {string} [html]
     * @param {WindowOptions} [options]
     */
    constructor(html = "", options = {}) {
      const mergedOptions = {
        ...options,
        settings: { ...SSR_SETTINGS, ...options.settings },
      };
      this.window = new Window(mergedOptions);
      this.window.SyntaxError = this.window.SyntaxError || SyntaxError;
      if (html) this.window.document.write(html);
    }

    serialize() {
      const { doctype, documentElement } = this.window.document;
      const doctypeString = doctype ? `<!DOCTYPE ${doctype.name}>` : "";
      return doctypeString + documentElement.outerHTML;
    }
  };
});

/**
 * Create a DOM instance with optional HTML content and Window options.
 * @param {string} [html] - Initial HTML content
 * @param {WindowOptions} [options] - Happy-DOM Window options
 * @returns {Promise<DOM>} DOM instance
 */
const loadDOM = async (html = "", options = {}) => {
  const DOM = await getDOMClass();
  return new DOM(html, options);
};

export { loadDOM };
