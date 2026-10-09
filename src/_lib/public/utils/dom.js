/**
 * Create an element with a class name in one step, so components that build
 * DOM cards don't each repeat the createElement + className pair.
 * @param {string} tag
 * @param {string} className
 * @returns {HTMLElement}
 */
export const createElement = (tag, className) => {
  const element = document.createElement(tag);
  element.className = className;
  return element;
};
