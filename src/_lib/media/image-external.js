/**
 * External image processing - handles images from external URLs.
 *
 * External images are fetched and processed through eleventy-img, which
 * downloads and caches them locally. This provides:
 * - Local caching for faster builds and reduced external requests
 * - Responsive image generation with multiple widths
 * - WebP format conversion
 * - LQIP (Low Quality Image Placeholder) generation
 */
import {
  extractLqipFromMetadata,
  getEleventyImg,
  LQIP_WIDTH,
  removeLqip,
} from "#media/image-lqip.js";
import {
  DEFAULT_IMAGE_OPTIONS,
  JPEG_FALLBACK_WIDTH,
  parseWidths,
  prepareImageAttributes,
} from "#media/image-utils.js";
import { compact } from "#toolkit/fp/array.js";
import { createHtml, parseHtml } from "#utils/dom-builder.js";
import { slugify } from "#utils/slug-utils.js";

/**
 * Generate filename for external images using slug.
 * @param {string} _id - Unique ID (unused)
 * @param {string} _src - Source URL (unused, we use slug instead)
 * @param {number} width - Image width
 * @param {string} format - Image format (webp, jpeg)
 * @param {Object} options - Options containing slug
 * @returns {string} Filename
 */
const externalFilenameFormat = (_id, _src, width, format, options) =>
  `${options.slug}-${width}.${format}`;

/**
 * Build wrapper styles for external images.
 * Uses CSS aspect-ratio since we can't read source metadata before processing.
 * @param {string | null} bgImage - LQIP background image data URL
 * @param {string | null} aspectRatio - Aspect ratio like "16/9"
 * @param {number | null} maxWidth - Maximum width from processed metadata
 * @returns {string} CSS style string
 */
const buildExternalWrapperStyles = (bgImage, aspectRatio, maxWidth) =>
  compact([
    bgImage && `background-image: ${bgImage}`,
    aspectRatio && `aspect-ratio: ${aspectRatio}`,
    maxWidth && `max-width: min(${maxWidth}px, 100%)`,
  ]).join("; ");

/**
 * Process an external image URL through eleventy-img.
 *
 * Note: No memoization - eleventy-img disk-caches the downloaded/processed images.
 * In-memory caching of HTML strings causes unbounded memory growth on large sites.
 *
 * @param {Object} options - Processing options
 * @param {string} options.src - External image URL
 * @param {string | null} options.alt - Alt text (used for filename slug)
 * @param {string | null} options.loading - Loading attribute
 * @param {string | null} options.classes - CSS classes
 * @param {string | null} options.sizes - Sizes attribute
 * @param {string | string[] | null} options.widths - Responsive widths
 * @param {string | null} options.aspectRatio - Aspect ratio like "16/9"
 * @returns {Promise<string>} Wrapped image HTML
 */
const computeExternalImageHtml = async ({
  src,
  alt,
  loading,
  classes,
  sizes,
  widths,
  aspectRatio,
}) => {
  const requestedWidths = parseWidths(widths);
  const webpWidths = [LQIP_WIDTH, ...requestedWidths];
  const eleventyImg = await getEleventyImg();
  const attrs = prepareImageAttributes({ alt, sizes, loading, classes });

  // Use slugified alt text for filename
  const filenameSlug = slugify(alt || "external-image");
  const imageOptions = {
    ...DEFAULT_IMAGE_OPTIONS,
    filenameFormat: externalFilenameFormat,
    slug: filenameSlug,
  };

  const [webpMetadata, jpegMetadata] = await Promise.all([
    eleventyImg.default(src, {
      ...imageOptions,
      formats: ["webp"],
      widths: webpWidths,
    }),
    eleventyImg.default(src, {
      ...imageOptions,
      formats: ["jpeg"],
      widths: [JPEG_FALLBACK_WIDTH],
    }),
  ]);

  const imageMetadata = { ...webpMetadata, ...jpegMetadata };

  // Extract LQIP from the 32px webp before filtering it out
  const bgImage = extractLqipFromMetadata(imageMetadata);

  // Filter out LQIP width from metadata so it doesn't appear in srcset
  const htmlMetadata = removeLqip(imageMetadata);

  const innerHTML = eleventyImg.generateHTML(
    htmlMetadata,
    attrs.imgAttributes,
    attrs.pictureAttributes,
  );

  // Get max width from processed metadata for wrapper styling
  const maxWidth = htmlMetadata.webp?.[htmlMetadata.webp.length - 1]?.width;

  return await createHtml(
    "div",
    {
      class: classes ? `image-wrapper ${classes}` : "image-wrapper",
      style: buildExternalWrapperStyles(bgImage, aspectRatio, maxWidth),
    },
    innerHTML,
  );
};

/**
 * Process an external image URL into HTML or an Element.
 * Downloads and caches the image locally via eleventy-img.
 * Throws an error if the remote image cannot be fetched.
 *
 * @param {Object} options - Processing options
 * @param {string} options.src - External image URL
 * @param {string | null} options.alt - Alt text (used for filename slug)
 * @param {string | null} options.loading - Loading attribute
 * @param {string | null} options.classes - CSS classes
 * @param {string | null} options.sizes - Sizes attribute
 * @param {string | string[] | null} options.widths - Responsive widths
 * @param {string | null} options.aspectRatio - Aspect ratio like "16/9"
 * @param {boolean} options.returnElement - Whether to return Element or HTML string
 * @param {Document | null} options.document - Optional document for element creation
 * @returns {Promise<string | Element>} HTML string or element
 */
const processExternalImage = async ({
  src,
  alt,
  loading,
  classes,
  sizes,
  widths,
  aspectRatio,
  returnElement,
  document,
}) => {
  const html = await computeExternalImageHtml({
    src,
    alt,
    loading,
    classes,
    sizes,
    widths,
    aspectRatio,
  });

  return returnElement ? await parseHtml(html, document) : html;
};

export { processExternalImage };
