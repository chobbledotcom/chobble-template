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

    // Returns the document HTML and triggers happy-dom's synchronous teardown
    // (mutation observers, document destroy, circular ref breaking). Remaining
    // async cleanup is fire-and-forget; it no longer retains DOM memory.
    serialize() {
      const { doctype, documentElement } = this.window.document;
      const doctypeString = doctype ? `<!DOCTYPE ${doctype.name}>` : "";
      const html = doctypeString + documentElement.outerHTML;
      const happyDOM = this.window?.happyDOM;
      const closer = happyDOM?.close || happyDOM?.abort;
      const p = closer?.call(happyDOM);
      if (p && typeof p.then === "function") p.catch(() => undefined);
      return html;
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

/**
 * Cap the number of Happy-DOM Windows alive at once. Each Window spins up a
 * VM context with its own prototype structures and module loaders (~10-20 MB
 * native overhead per instance); Eleventy's default transform parallelism
 * lets them stack linearly. Callers wrap their work with run() to gate it.
 *
 * Wakeup model: a single shared "freed" promise resolves whenever any slot
 * is released. Waiters loop until they see an open slot. Resetting the
 * promise on each release makes the waiter re-check after wakeup, which
 * correctly handles N waiters competing for K free slots.
 */
/** @template T */
class Semaphore {
  #limit;
  #busy = 0;
  #waiters;

  /** @param {number} limit */
  constructor(limit) {
    this.#limit = limit;
    this.#waiters = Promise.withResolvers();
  }

  /**
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  async run(fn) {
    while (this.#busy >= this.#limit) await this.#waiters.promise;
    this.#busy += 1;
    try {
      return await fn();
    } finally {
      this.#busy -= 1;
      const previous = this.#waiters;
      this.#waiters = Promise.withResolvers();
      previous.resolve();
    }
  }
}

const domSemaphore = new Semaphore(4);

/**
 * Run an async task while holding one of a limited number of DOM slots.
 * Reduces peak memory when many pages need DOM transforms in parallel.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
const withDOMSlot = (fn) => domSemaphore.run(fn);

export { loadDOM, withDOMSlot };
