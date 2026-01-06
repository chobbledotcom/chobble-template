// Happy-dom with DOM manipulation API
// Provides a lightweight DOM implementation for server-side rendering

import { createLazyLoader } from "#utils/lazy-loader.js";

const getDOMClass = createLazyLoader("happy-dom", {
  transform: (mod) => {
    const { Window } = mod;

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
  },
});

// Create a DOM instance with optional HTML content
const loadDOM = async (html = "") => {
  const DOM = await getDOMClass();
  return new DOM(html);
};

export { loadDOM };
