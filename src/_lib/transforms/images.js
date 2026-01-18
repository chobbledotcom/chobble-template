/**
 * DOM transform for processing images.
 *
 * Finds <img src="/images/..."> tags and replaces them with responsive
 * picture elements. Also handles:
 * - eleventy:aspectRatio attribute for custom aspect ratios
 * - eleventy:ignore attribute to skip processing
 * - Fixing invalid HTML where divs are sole children of paragraphs
 */

/** @typedef {import("#lib/types").ImageTransformOptions} ImageTransformOptions */
/** @typedef {import("#lib/types").ProcessImageFn} ProcessImageFn */

const ASPECT_RATIO_ATTRIBUTE = "eleventy:aspectRatio";
const IGNORE_ATTRIBUTE = "eleventy:ignore";

/**
 * Fix invalid HTML where divs are sole children of paragraphs
 * @param {Document} document
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
 * @param {Document} document
 * @returns {ImageTransformOptions}
 */
const extractImageOptions = (img, document) => {
  const aspectRatio = img.getAttribute(ASPECT_RATIO_ATTRIBUTE);
  if (aspectRatio) img.removeAttribute(ASPECT_RATIO_ATTRIBUTE);

  return {
    logName: `transformImages: ${img}`,
    imageName: img.getAttribute("src"),
    alt: img.getAttribute("alt"),
    classes: img.getAttribute("class"),
    sizes: img.getAttribute("sizes"),
    widths: img.getAttribute("widths"),
    aspectRatio,
    loading: null,
    returnElement: true,
    document,
  };
};

/**
 * Process a single image element
 * @param {Element} img
 * @param {Document} document
 * @param {ProcessImageFn} processAndWrapImage
 * @returns {Promise<void>}
 */
const processImageElement = async (img, document, processAndWrapImage) => {
  if (img.hasAttribute(IGNORE_ATTRIBUTE)) {
    img.removeAttribute(IGNORE_ATTRIBUTE);
    return;
  }
  const parent = img.parentElement;
  if (parent?.classList?.contains("image-wrapper")) return;
  const wrapped = await processAndWrapImage(extractImageOptions(img, document));
  if (typeof wrapped !== "string") {
    parent.replaceChild(wrapped, img);
  }
};

/**
 * Process all images in document
 * @param {Document} document
 * @param {object} _config - Unused, included for consistent transform signature
 * @param {ProcessImageFn} processAndWrapImage - Image processing function
 * @returns {Promise<void>}
 */
const processImages = async (document, _config, processAndWrapImage) => {
  const images = document.querySelectorAll('img[src^="/images/"]');

  if (images.length === 0) return;

  await Promise.all(
    Array.from(images).map((img) =>
      processImageElement(
        /** @type {*} */ (img),
        document,
        processAndWrapImage,
      ),
    ),
  );

  fixDivsInParagraphs(document);
};

export {
  processImages,
  fixDivsInParagraphs,
  extractImageOptions,
  processImageElement,
  ASPECT_RATIO_ATTRIBUTE,
  IGNORE_ATTRIBUTE,
};
