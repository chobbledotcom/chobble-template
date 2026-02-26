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
import crypto from "node:crypto";
import { getEleventyImg, LQIP_WIDTH } from "#media/image-lqip.js";
import * as pipeline from "#media/image-pipeline.js";
import * as imageUtils from "#media/image-utils.js";
import { wrapImageHtml } from "#media/image-wrapper.js";
import { compact } from "#toolkit/fp/array.js";
import { jsonKey, memoize } from "#toolkit/fp/memoize.js";
import { createHtml } from "#utils/dom-builder.js";
import { slugify } from "#utils/slug-utils.js";
import { isRickAstleyThumbnail } from "#utils/video.js";

const shortHash = (str) =>
  crypto.createHash("md5").update(str).digest("hex").slice(0, 8);

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
const buildExternalWrapperStyles = (
  bgImage,
  aspectRatio,
  maxWidth,
  skipMaxWidth = false,
) =>
  compact([
    bgImage && `background-image: ${bgImage}`,
    aspectRatio && `aspect-ratio: ${aspectRatio}`,
    !skipMaxWidth && maxWidth && `max-width: min(${maxWidth}px, 100%)`,
  ]).join("; ");

/**
 * Process an external image URL through eleventy-img.
 *
 * Memoized to avoid reprocessing the same URL with same options.
 * While eleventy-img disk-caches downloaded images, memoization avoids:
 * - Repeated disk I/O for LQIP base64 encoding
 * - Repeated eleventy-img cache checks
 * - Repeated HTML generation
 * Cache is bounded by maxCacheSize (default 2000) to prevent unbounded memory growth.
 *
 * @param {Object} options - Processing options
 * @param {string} options.src - External image URL
 * @param {string | null} options.alt - Alt text (used for filename slug)
 * @param {string | null} options.loading - Loading attribute
 * @param {string | null} options.classes - CSS classes
 * @param {string | null} options.sizes - Sizes attribute
 * @param {string | string[] | null} options.widths - Responsive widths
 * @param {string | null} options.aspectRatio - Aspect ratio like "16/9"
 * @param {boolean} [options.skipMaxWidth] - Skip max-width constraint
 * @returns {Promise<string>} Wrapped image HTML
 */
const computeExternalImageHtml = memoize(
  async ({
    src,
    alt,
    loading,
    classes,
    sizes,
    widths,
    aspectRatio,
    skipMaxWidth = false,
  }) => {
    const requestedWidths = imageUtils.parseWidths(widths);
    const webpWidths = [LQIP_WIDTH, ...requestedWidths];
    const { default: imageFn } = await getEleventyImg();
    const attrs = imageUtils.prepareImageAttributes({
      alt,
      sizes,
      loading,
      classes,
    });

    const filenameSlug = `${slugify(alt || "external-image")}-${shortHash(src)}`;
    const imageOptions = {
      ...imageUtils.DEFAULT_IMAGE_OPTIONS,
      filenameFormat: externalFilenameFormat,
      slug: filenameSlug,
    };

    const imageMetadata = await pipeline.processFormats(
      imageFn,
      src,
      imageOptions,
      webpWidths,
    );

    const { bgImage, htmlMetadata } =
      await pipeline.prepareLqipMetadata(imageMetadata);

    const innerHTML = await pipeline.generatePictureHtml(
      htmlMetadata,
      attrs.imgAttributes,
      attrs.pictureAttributes,
    );

    const maxWidth = htmlMetadata.webp?.[htmlMetadata.webp.length - 1]?.width;

    return await wrapImageHtml(innerHTML, {
      classes,
      style: buildExternalWrapperStyles(
        bgImage,
        aspectRatio,
        maxWidth,
        skipMaxWidth,
      ),
    });
  },
  { cacheKey: jsonKey },
);

/**
 * @param {string | null} classes - CSS classes
 * @param {string | null} aspectRatio - Aspect ratio like "16/9"
 * @returns {Promise<string>} Placeholder image HTML
 */
const generateRickAstleyPlaceholder = async (classes, aspectRatio) => {
  const imgHtml = await createHtml("img", {
    src: "/images/placeholders/pink.svg",
    alt: "Video thumbnail",
    loading: "lazy",
  });
  return wrapImageHtml(imgHtml, {
    classes,
    style: compact([aspectRatio && `aspect-ratio: ${aspectRatio}`]).join("; "),
  });
};

/**
 * Process an external image URL into HTML or an Element.
 * Downloads and caches the image locally via eleventy-img.
 * Throws an error if the remote image cannot be fetched, unless the URL is
 * a Rick Astley placeholder video thumbnail — in that case, returns a
 * placeholder SVG to allow the build to continue.
 *
 * @param {Object} options - Processing options
 * @param {string} options.src - External image URL
 * @param {string | null} options.alt - Alt text (used for filename slug)
 * @param {string | null} options.loading - Loading attribute
 * @param {string | null} options.classes - CSS classes
 * @param {string | null} options.sizes - Sizes attribute
 * @param {string | string[] | null} options.widths - Responsive widths
 * @param {string | null} options.aspectRatio - Aspect ratio like "16/9"
 * @param {boolean} [options.skipMaxWidth] - Skip max-width constraint
 * @param {boolean} options.returnElement - Whether to return Element or HTML string
 * @param {Document | null} options.document - Optional document for element creation
 * @returns {Promise<string | Element>} HTML string or element
 */
const processExternalImage = async ({
  returnElement,
  document: doc,
  ...imageProps
}) => {
  const html = await computeExternalImageHtml(imageProps).catch(
    async (error) => {
      if (!isRickAstleyThumbnail(imageProps.src)) {
        throw error;
      }
      return generateRickAstleyPlaceholder(
        imageProps.classes,
        imageProps.aspectRatio,
      );
    },
  );

  return pipeline.resolveOutput(html, returnElement, doc);
};

export { processExternalImage };
