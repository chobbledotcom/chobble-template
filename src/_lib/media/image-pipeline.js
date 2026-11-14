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
import { createHtml, parseHtml } from "#utils/dom-builder.js";
import { join } from "#utils/fp/array.js";

/**
 * Wrap image HTML in the standard image wrapper.
 * @param {string} innerHtml
 * @param {Object} options
 * @param {string | null | undefined} options.classes
 * @param {string | null | undefined} options.style
 * @returns {Promise<string>}
 */
export const wrapImageHtml = (innerHtml, { classes, style }) => {
  const classParts = classes ? ["image-wrapper", classes] : ["image-wrapper"];
  const className = join(" ")(classParts);
  const styleAttr = style === undefined ? null : style;
  return createHtml("div", { class: className, style: styleAttr }, innerHtml);
};

/**
 * Metadata returned by eleventy-img: format name -> generated variants.
 * @typedef {Record<string, Array<{ width: number, outputPath: string }>>} ImageMetadata
 */

/**
 * Process image through parallel webp + jpeg format generation.
 * @param {Function} imageFn - eleventy-img processing function
 * @param {string} path - Image path or URL
 * @param {Object} baseOptions - Base options (outputDir, filenameFormat, etc.)
 * @param {(number | string)[]} webpWidths - Widths for webp format (includes "auto" for original)
 * @param {(number | string)[]} [jpegWidths] - Widths for the JPEG fallback
 * @returns {Promise<ImageMetadata>} Combined webp + jpeg image metadata
 */
export const processFormats = async (
  imageFn,
  path,
  baseOptions,
  webpWidths,
  jpegWidths = [JPEG_FALLBACK_WIDTH],
) => {
  const [webpMetadata, jpegMetadata] = await Promise.all([
    imageFn(path, { ...baseOptions, formats: ["webp"], widths: webpWidths }),
    imageFn(path, {
      ...baseOptions,
      formats: ["jpeg"],
      widths: jpegWidths,
    }),
  ]);
  return { ...webpMetadata, ...jpegMetadata };
};

/**
 * Extract LQIP and prepare metadata for HTML generation.
 * When shouldExtract is true, extracts the LQIP base64 background image
 * and removes the LQIP-width entry from metadata.
 * @param {ImageMetadata} imageMetadata - Combined metadata from processFormats
 * @param {boolean} [shouldExtract=true] - Whether to extract LQIP
 * @returns {Promise<{bgImage: string|null, htmlMetadata: Record<string, Array<{ width: number }>>}>}
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
 * Generate picture HTML and wrap it in the standard image wrapper.
 * Shared by both local and external image processing paths.
 * @param {Object} htmlMetadata - Metadata (with LQIP filtered out)
 * @param {Object} imgAttributes - Image element attributes
 * @param {Object} pictureAttributes - Picture element attributes
 * @param {Object} wrapperOptions
 * @param {string | null} [wrapperOptions.classes] - CSS classes
 * @param {string | null} [wrapperOptions.style] - CSS style string
 * @returns {Promise<string>} Wrapped picture HTML
 */
export const wrapProcessedImage = async (
  htmlMetadata,
  imgAttributes,
  pictureAttributes,
  { classes, style },
) => {
  const { generateHTML } = await getEleventyImg();
  const innerHTML = generateHTML(
    htmlMetadata,
    imgAttributes,
    pictureAttributes,
  );
  return wrapImageHtml(innerHTML, { classes, style });
};

/**
 * Convert HTML string to DOM Element if requested. Wrapped image HTML is
 * never empty, so a null parse is a broken invariant, not a result.
 * @param {string} html - HTML string
 * @param {boolean} returnElement - Whether to return Element
 * @param {Document|null} document - Document for element creation
 * @returns {Promise<string|Element>}
 */
export const resolveOutput = async (html, returnElement, document) => {
  if (!returnElement) return html;
  const element = await parseHtml(html, document);
  if (!element) throw new Error(`Image HTML parsed to no element: ${html}`);
  return element;
};
