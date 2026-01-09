// HTML image transformation for Eleventy build output
// Finds <img> tags and replaces them with responsive picture elements

import { loadDOM } from "#utils/lazy-dom.js";

const ASPECT_RATIO_ATTRIBUTE = "eleventy:aspectRatio";
const IGNORE_ATTRIBUTE = "eleventy:ignore";

// Fix invalid HTML where divs are sole child of paragraphs
const fixDivsInParagraphs = (document) => {
  const invalidParagraphs = Array.from(document.querySelectorAll("p")).filter(
    (p) => p.childNodes.length === 1 && p.firstChild.nodeName === "DIV",
  );
  for (const p of invalidParagraphs) {
    p.parentNode.insertBefore(p.firstChild, p);
    p.parentNode.removeChild(p);
  }
};

// Extract image options from img element
/**
 * @param {HTMLImageElement} img - The img DOM element
 * @param {Document} document - The DOM document
 * @returns {Object} Options object with imageName from getAttribute (string | null)
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

// Process single image element
/**
 * @param {HTMLImageElement} img - The img DOM element
 * @param {Document} document - The DOM document
 * @param {Function} processAndWrapImage - Callback that receives options with imageName: string | null
 */
const processImageElement = async (img, document, processAndWrapImage) => {
  if (img.hasAttribute(IGNORE_ATTRIBUTE)) {
    img.removeAttribute(IGNORE_ATTRIBUTE);
    return;
  }
  // Type guard: ensure parentNode is Element (narrows type for subsequent uses)
  if (!(img.parentNode instanceof Element)) return;
  /** @type {Element} */
  const parent = img.parentNode;

  if (parent.classList.contains("image-wrapper")) return;
  // Pass extractImageOptions result where imageName is string | null from getAttribute
  const wrapped = await processAndWrapImage(extractImageOptions(img, document));
  parent.replaceChild(wrapped, img);
};

// Transform all images in HTML content
/**
 * @param {string} content - The HTML content to transform
 * @param {Function} processAndWrapImage - Callback receiving options with imageName: string | null
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
      // Passes img elements where getAttribute returns string | null
      processImageElement(img, document, processAndWrapImage),
    ),
  );

  fixDivsInParagraphs(document);
  return dom.serialize();
};

// Create image transform for Eleventy
/**
 * @param {Function} processAndWrapImage - Callback receiving options with imageName: string | null
 * @returns {Function} Transform function for Eleventy
 */
const createImageTransform =
  (processAndWrapImage) => async (content, outputPath) => {
    if (typeof outputPath !== "string" || !outputPath.endsWith(".html"))
      return content;
    if (outputPath.includes("/feed.")) return content;
    // Passes processAndWrapImage to transformImages, which calls it with imageName: string | null
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
