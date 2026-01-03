// Lazy-loaded happy-dom with JSDOM-compatible API
// This module provides the same interface as jsdom but uses happy-dom

let HappyDOMWrapper = null;

const loadJSDOM = async () => {
  if (!HappyDOMWrapper) {
    const { Window } = await import("happy-dom");

    // JSDOM-compatible wrapper for happy-dom
    HappyDOMWrapper = class {
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
  }
  return HappyDOMWrapper;
};

export { loadJSDOM };
