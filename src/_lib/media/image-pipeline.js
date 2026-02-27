/**
 * Shared image processing pipeline.
 *
 * Extracts the common processing flow shared between local (image.js)
 * and external (image-external.js) image processing:
 * 1. Process webp + jpeg formats in parallel
 * 2. Extract LQIP and prepare metadata for HTML generation
 * 3. Convert HTML to Element when requested
 */
import {
  extractLqipFromMetadata,
  getEleventyImg,
  removeLqip,
} from "#media/image-lqip.js";
import { JPEG_FALLBACK_WIDTH } from "#media/image-utils.js";
import { wrapImageHtml } from "#media/image-wrapper.js";
import { parseHtml } from "#utils/dom-builder.js";

/**
 * Process image through parallel webp + jpeg format generation.
 * @param {Function} imageFn - eleventy-img processing function
 * @param {string} path - Image path or URL
 * @param {Object} baseOptions - Base options (outputDir, filenameFormat, etc.)
 * @param {number[]} webpWidths - Widths for webp format (may include LQIP width)
 * @returns {Promise<Object>} Combined webp + jpeg image metadata
 */
export const processFormats = async (
  imageFn,
  path,
  baseOptions,
  webpWidths,
) => {
  const [webpMetadata, jpegMetadata] = await Promise.all([
    imageFn(path, { ...baseOptions, formats: ["webp"], widths: webpWidths }),
    imageFn(path, {
      ...baseOptions,
      formats: ["jpeg"],
      widths: [JPEG_FALLBACK_WIDTH],
    }),
  ]);
  return { ...webpMetadata, ...jpegMetadata };
};

/**
 * Extract LQIP and prepare metadata for HTML generation.
 * When shouldExtract is true, extracts the LQIP base64 background image
 * and removes the LQIP-width entry from metadata.
 * @param {Object} imageMetadata - Combined metadata from processFormats
 * @param {boolean} [shouldExtract=true] - Whether to extract LQIP
 * @returns {Promise<{bgImage: string|null, htmlMetadata: Object}>}
 */
export const prepareLqipMetadata = async (
  imageMetadata,
  shouldExtract = true,
) => {
  const bgImage = shouldExtract
    ? await extractLqipFromMetadata(imageMetadata)
    : null;
  const htmlMetadata = shouldExtract
    ? removeLqip(imageMetadata)
    : imageMetadata;
  return { bgImage, htmlMetadata };
};

/**
 * Generate picture element HTML from processed metadata.
 * @param {Object} htmlMetadata - Metadata (with LQIP filtered out)
 * @param {Object} imgAttributes - Image element attributes
 * @param {Object} pictureAttributes - Picture element attributes
 * @returns {Promise<string>} Generated HTML
 */
export const generatePictureHtml = async (
  htmlMetadata,
  imgAttributes,
  pictureAttributes,
) => {
  const { generateHTML } = await getEleventyImg();
  return generateHTML(htmlMetadata, imgAttributes, pictureAttributes);
};

/**
 * Generate picture HTML and wrap it in the standard image wrapper.
 * Shared by both local and external image processing paths.
 * @param {Object} htmlMetadata - Metadata (with LQIP filtered out)
 * @param {Object} imgAttributes - Image element attributes
 * @param {Object} pictureAttributes - Picture element attributes
 * @param {Object} wrapperOptions
 * @param {string | null} wrapperOptions.classes - CSS classes
 * @param {string} wrapperOptions.style - CSS style string
 * @returns {Promise<string>} Wrapped picture HTML
 */
export const wrapProcessedImage = async (
  htmlMetadata,
  imgAttributes,
  pictureAttributes,
  { classes, style },
) => {
  const innerHTML = await generatePictureHtml(
    htmlMetadata,
    imgAttributes,
    pictureAttributes,
  );
  return wrapImageHtml(innerHTML, { classes, style });
};

/**
 * Convert HTML string to DOM Element if requested.
 * @param {string} html - HTML string
 * @param {boolean} returnElement - Whether to return Element
 * @param {Document|null} document - Document for element creation
 * @returns {Promise<string|Element>}
 */
export const resolveOutput = async (html, returnElement, document) =>
  returnElement ? await parseHtml(html, document) : html;
