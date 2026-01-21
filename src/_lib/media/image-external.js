/**
 * External image processing - handles images from external URLs.
 *
 * External images are not processed through eleventy-img since they
 * can't be optimized locally. Instead, they get a simple img tag
 * with appropriate loading attributes.
 */
import { buildImgAttributes } from "#media/image-utils.js";
import {
  applyAttributes,
  createHtml,
  getSharedDocument,
} from "#utils/dom-builder.js";

/**
 * Create an img element from a document.
 * @param {Document} doc
 * @returns {HTMLImageElement}
 */
const createImgElement = (doc) => doc.createElement("img");

/**
 * Create an img element for external URLs
 * @param {Record<string, string>} attributes - Image attributes
 * @param {Document | null} document - Optional document to use
 * @returns {Promise<HTMLImageElement>} The created img element
 */
const createElement = async (attributes, document) => {
  const doc = document || (await getSharedDocument());
  const img = createImgElement(doc);
  applyAttributes(img, attributes);
  return img;
};

/**
 * Process an external image URL into HTML or an Element
 * @param {Object} options - Processing options
 * @param {string} options.src - External image URL
 * @param {string | null} options.alt - Alt text
 * @param {string | null} options.loading - Loading attribute
 * @param {string | null} options.classes - CSS classes
 * @param {boolean} options.returnElement - Whether to return Element or HTML string
 * @param {Document | null} options.document - Optional document for element creation
 * @returns {Promise<string | HTMLImageElement>} HTML string or img element
 */
const processExternalImage = async ({
  src,
  alt,
  loading,
  classes,
  returnElement,
  document,
}) => {
  const attributes = buildImgAttributes({ src, alt, loading, classes });
  return returnElement
    ? await createElement(attributes, document)
    : await createHtml("img", attributes);
};

export { processExternalImage };
