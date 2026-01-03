// Lazy-loaded happy-dom with JSDOM-compatible API
// This module provides the same interface as jsdom but uses happy-dom
import { Window } from "happy-dom";

// JSDOM-compatible wrapper for happy-dom
class HappyDOMWrapper {
  constructor(html = "") {
    this.window = new Window();
    if (html) {
      this.window.document.write(html);
    }
  }

  serialize() {
    return this.window.document.documentElement.outerHTML;
  }
}

const loadJSDOM = async () => {
  return HappyDOMWrapper;
};

export { loadJSDOM };
