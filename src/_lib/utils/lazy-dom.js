// Happy-dom with DOM manipulation API
// Provides a lightweight DOM implementation for server-side rendering

import { memoize } from "#utils/memoize.js";

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

// Create a DOM instance with optional HTML content
const loadDOM = async (html = "") => {
  const DOM = await getDOMClass();
  return new DOM(html);
};

// Transform HTML content via DOM manipulation
const transformDOM = async (content, manipulate) => {
  const dom = await loadDOM(content);
  manipulate(dom.window.document);
  return dom.serialize();
};

export { loadDOM, transformDOM };
