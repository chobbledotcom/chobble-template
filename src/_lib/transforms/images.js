/**
 * DOM transform for processing images.
 *
 * Finds <img src="/images/..."> tags and replaces them with responsive
 * picture elements. Also handles:
 * - eleventy:aspectRatio attribute for custom aspect ratios
 * - eleventy:ignore attribute to skip processing
 * - chobble:no-lqip attribute to skip LQIP generation
 * - Fixing invalid HTML where divs are sole children of paragraphs
 */

import { mapAsync } from "#toolkit/fp/array.js";

/** @typedef {import("#lib/types").ImageTransformOptions} ImageTransformOptions */
/** @typedef {import("#lib/types").ProcessImageFn} ProcessImageFn */

const ASPECT_RATIO_ATTRIBUTE = "eleventy:aspectRatio";
const IGNORE_ATTRIBUTE = "eleventy:ignore";
const NO_LQIP_ATTRIBUTE = "chobble:no-lqip";

/**
 * Fix invalid HTML where divs are sole children of paragraphs
 * @param {*} document
 */
const fixDivsInParagraphs = (document) => {
  const invalidParagraphs = Array.from(document.querySelectorAll("p")).filter(
    (p) => p.childNodes.length === 1 && p.firstChild.nodeName === "DIV",
  );
  for (const p of invalidParagraphs) {
    p.parentNode.insertBefore(p.firstChild, p);
    p.parentNode.removeChild(p);
  }
};

/**
 * Extract image options from an img element
 * @param {Element} img
 * @param {*} document
 * @returns {ImageTransformOptions}
 */
const extractImageOptions = (img, document) => {
  const aspectRatio = img.getAttribute(ASPECT_RATIO_ATTRIBUTE);
  if (aspectRatio) img.removeAttribute(ASPECT_RATIO_ATTRIBUTE);

  const noLqip = img.hasAttribute(NO_LQIP_ATTRIBUTE);
  if (noLqip) img.removeAttribute(NO_LQIP_ATTRIBUTE);

  const imageName = img.getAttribute("src");
  if (!imageName) throw new Error("img element missing src attribute");

  return {
    logName: `transformImages: ${img}`,
    imageName,
    alt: img.getAttribute("alt"),
    classes: img.getAttribute("class"),
    sizes: img.getAttribute("sizes"),
    widths: img.getAttribute("widths"),
    aspectRatio,
    loading: null,
    noLqip,
    returnElement: true,
    document,
  };
};

/**
 * Process a single image element
 * @param {Element} img
 * @param {*} document
 * @param {ProcessImageFn} processAndWrapImage
 * @returns {Promise<void>}
 */
const processImageElement = async (img, document, processAndWrapImage) => {
  if (img.hasAttribute(IGNORE_ATTRIBUTE)) {
    img.removeAttribute(IGNORE_ATTRIBUTE);
    return;
  }
  if (img.parentElement?.classList?.contains("image-wrapper")) return;
  const wrapped = await processAndWrapImage(extractImageOptions(img, document));
  if (typeof wrapped !== "string" && img.parentElement) {
    img.parentElement.replaceChild(wrapped, img);
  }
};

/**
 * Process all images in document
 * @param {*} document
 * @param {object} _config - Unused, included for consistent transform signature
 * @param {ProcessImageFn} processAndWrapImage - Image processing function
 * @returns {Promise<void>}
 */
const processImages = async (document, _config, processAndWrapImage) => {
  const images = document.querySelectorAll('img[src^="/images/"]');

  if (images.length === 0) return;

  await mapAsync((img) =>
    processImageElement(img, document, processAndWrapImage),
  )(images);

  fixDivsInParagraphs(document);
};

export {
  processImages,
  fixDivsInParagraphs,
  extractImageOptions,
  processImageElement,
  ASPECT_RATIO_ATTRIBUTE,
  IGNORE_ATTRIBUTE,
  NO_LQIP_ATTRIBUTE,
};
