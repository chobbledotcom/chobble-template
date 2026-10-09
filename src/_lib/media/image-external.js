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
import {
  buildImageWrapperStyles,
  DEFAULT_IMAGE_OPTIONS,
  parseWidths,
  prepareImageAttributes,
} from "#media/image-utils.js";
import { dedupeAsync, jsonKey } from "#utils/fp/memoize.js";
import { slugify } from "#utils/slug-utils.js";

const EXTERNAL_IMAGE_OPTIONS = {
  ...DEFAULT_IMAGE_OPTIONS,
  /**
   * @param {string} _id
   * @param {string} _src
   * @param {number} width
   * @param {string} format
   * @param {{ slug: string }} options
   */
  filenameFormat: (_id, _src, width, format, options) =>
    `${options.slug}-${width}.${format}`,
};

/**
 * Process an external image URL through eleventy-img into wrapped HTML.
 * Downloads and caches the image locally; throws if it cannot be fetched.
 *
 * Deduplicated to avoid duplicate concurrent work for the same URL/options tuple.
 * While eleventy-img disk-caches downloaded images, this still prevents
 * overlapping fetch/processing work without retaining every settled result in memory.
 */
const processExternal = dedupeAsync(
  /**
   * @param {Omit<import("#lib/types").ComputeImageProps, "imageName" | "noLqip"> & { src: string }} props
   */
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
    const requestedWidths = parseWidths(widths);
    const webpWidths = [LQIP_WIDTH, ...requestedWidths];
    const { default: imageFn } = await getEleventyImg();
    const attrs = prepareImageAttributes({
      alt,
      sizes,
      loading,
      classes,
    });

    const urlHash = crypto
      .createHash("md5")
      .update(src)
      .digest("hex")
      .slice(0, 8);
    const imageOptions = {
      ...EXTERNAL_IMAGE_OPTIONS,
      slug: `${slugify(alt || "external-image")}-${urlHash}`,
    };

    const imageMetadata = await pipeline.processFormats(
      imageFn,
      src,
      imageOptions,
      webpWidths,
    );

    const { bgImage, htmlMetadata } =
      await pipeline.prepareLqipMetadata(imageMetadata);

    const maxWidth = htmlMetadata.webp?.[htmlMetadata.webp.length - 1]?.width;

    return await pipeline.wrapProcessedImage(
      htmlMetadata,
      attrs.imgAttributes,
      attrs.pictureAttributes,
      {
        classes,
        style: buildImageWrapperStyles({
          bgImage,
          aspectRatio,
          maxWidth,
          skipMaxWidth,
        }),
      },
    );
  },
  { cacheKey: jsonKey },
);

/**
 * Compute wrapped HTML for an external image from the shared image-props
 * shape: renames imageName to the pipeline's src and drops the local-only
 * noLqip flag so it cannot fragment the dedupe cache key.
 * @param {import("#lib/types").ComputeImageProps} props
 * @returns {Promise<string>} Wrapped image HTML
 */
const computeExternalImageHtml = ({ imageName, noLqip: _noLqip, ...props }) =>
  processExternal({ src: imageName, ...props });

export { computeExternalImageHtml };
