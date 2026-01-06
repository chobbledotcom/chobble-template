// DOM utility functions

/**
 * Create an element with class and optional text content.
 *
 * @param {string} tag - The HTML tag name
 * @param {string} className - CSS class(es) to apply
 * @param {string} [textContent] - Optional text content
 * @returns {HTMLElement} The created element
 */
const createElement = (tag, className, textContent = "") => {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = textContent;
  return el;
};

export { createElement };
