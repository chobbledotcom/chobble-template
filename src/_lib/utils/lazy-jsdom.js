// Happy-dom with JSDOM-compatible API
// This module provides the same interface as jsdom but uses happy-dom

import { createLazyLoader } from "#utils/lazy-loader.js";

const loadJSDOM = createLazyLoader("happy-dom", {
  transform: (mod) => {
    const { Window } = mod;

    // JSDOM-compatible wrapper for happy-dom
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
  },
});

export { loadJSDOM };
