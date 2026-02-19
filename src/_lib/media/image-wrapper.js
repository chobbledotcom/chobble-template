import { join } from "#toolkit/fp/array.js";
import { createHtml } from "#utils/dom-builder.js";

/**
 * Wrap image HTML in the standard image wrapper.
 * @param {string} innerHtml
 * @param {Object} options
 * @param {string | null | undefined} options.classes
 * @param {string | null | undefined} options.style
 * @returns {Promise<string>}
 */
const wrapImageHtml = (innerHtml, { classes, style }) => {
  const classParts = classes ? ["image-wrapper", classes] : ["image-wrapper"];
  const className = join(" ")(classParts);
  return createHtml("div", { class: className, style }, innerHtml);
};

export { wrapImageHtml };
