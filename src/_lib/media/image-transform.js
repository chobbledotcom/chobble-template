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

// Process single image element
const processImageElement = async (img, document, processAndWrapImage) => {
  if (img.hasAttribute(IGNORE_ATTRIBUTE)) {
    img.removeAttribute(IGNORE_ATTRIBUTE);
    return;
  }
  if (img.parentNode.classList.contains("image-wrapper")) return;
  const wrapped = await processAndWrapImage(extractImageOptions(img, document));
  img.parentNode.replaceChild(wrapped, img);
};

// Transform all images in HTML content
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

// Create image transform for Eleventy
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
