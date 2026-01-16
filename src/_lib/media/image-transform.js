/**
 * HTML image transformation for Eleventy build output.
 *
 * Finds <img src="/images/..."> tags and replaces them with responsive
 * picture elements using eleventy-img. Also handles:
 * - eleventy:aspectRatio attribute for custom aspect ratios
 * - eleventy:ignore attribute to skip processing
 * - Fixing invalid HTML where divs are sole children of paragraphs
 */
import { loadDOM } from "#utils/lazy-dom.js";

/**
 * @typedef {Object} ImageOptions
 * @property {string} logName - Debug logging name
 * @property {string | null} imageName - Image src from getAttribute (string | null)
 * @property {string | null} alt - Alt text from getAttribute
 * @property {string | null} classes - CSS classes from getAttribute
 * @property {string | null} sizes - Responsive sizes from getAttribute
 * @property {string | null} widths - Image widths from getAttribute
 * @property {string | null} aspectRatio - Aspect ratio from custom attribute
 * @property {null} loading - Always null from transform
 * @property {true} returnElement - Always true for transform
 * @property {Document} document - DOM document for element creation
 */

/**
 * @typedef {(options: ImageOptions) => Promise<Element>} ProcessImageFn
 */

const ASPECT_RATIO_ATTRIBUTE = "eleventy:aspectRatio";
const IGNORE_ATTRIBUTE = "eleventy:ignore";

/**
 * Fix invalid HTML where divs are sole children of paragraphs
 * @param {Document} document - DOM document to modify
 * @returns {void}
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
 * @param {HTMLImageElement} img - The img DOM element
 * @param {Document} document - The DOM document
 * @returns {ImageOptions} Options object with imageName from getAttribute (string | null)
 */
const extractImageOptions = (img, document) => {
  const aspectRatio = img.getAttribute(ASPECT_RATIO_ATTRIBUTE);
  if (aspectRatio) img.removeAttribute(ASPECT_RATIO_ATTRIBUTE);

  return {
    logName: `transformImages: ${img}`,
    imageName: img.getAttribute("src"), // getAttribute returns string | null
    alt: img.getAttribute("alt"), // string | null
    classes: img.getAttribute("class"), // string | null
    sizes: img.getAttribute("sizes"), // string | null
    widths: img.getAttribute("widths"), // string | null
    aspectRatio, // string | null
    loading: null,
    returnElement: true,
    document,
  };
};

/**
 * Process a single image element
 * @param {HTMLImageElement} img - The img DOM element
 * @param {Document} document - The DOM document
 * @param {ProcessImageFn} processAndWrapImage - Callback that receives options with imageName: string | null
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
  parent.replaceChild(wrapped, img);
};

/**
 * Transform images in HTML content
 * @param {string} content - The HTML content to transform
 * @param {ProcessImageFn} processAndWrapImage - Callback receiving options with imageName: string | null
 * @returns {Promise<string>} Transformed HTML content
 */
const transformImages = async (content, processAndWrapImage) => {
  if (!content?.includes("<img")) return content;
  if (!content.includes('src="/images/')) return content;

  const dom = await loadDOM(content);
  const { document } = dom.window;
  const images = document.querySelectorAll('img[src^="/images/"]');

  if (images.length === 0) return content;

  await Promise.all(
    Array.from(images).map((img) =>
      processImageElement(img, document, processAndWrapImage),
    ),
  );

  fixDivsInParagraphs(document);
  return dom.serialize();
};

/**
 * Create an Eleventy transform for image processing
 * @param {ProcessImageFn} processAndWrapImage - Callback receiving options with imageName: string | null
 * @returns {(content: string, outputPath: string) => Promise<string>} Transform function for Eleventy
 */
const createImageTransform =
  (processAndWrapImage) => async (content, outputPath) => {
    if (typeof outputPath !== "string" || !outputPath.endsWith(".html"))
      return content;
    if (outputPath.includes("/feed.")) return content;
    return await transformImages(content, processAndWrapImage);
  };

export {
  ASPECT_RATIO_ATTRIBUTE,
  fixDivsInParagraphs,
  extractImageOptions,
  processImageElement,
  transformImages,
  createImageTransform,
};
