/**
 * Image processing for Eleventy - wraps eleventy-img with cropping and LQIP.
 *
 * Entry points:
 * - configureImages(): Registers Eleventy plugin with shortcode and collection
 * - imageShortcode(): Template shortcode for manual image processing
 * - processAndWrapImage(): Main function for image processing (used by html-transform)
 *
 * Processing flow:
 * - processAndWrapImage(): Main function, handles external URLs with simple img tag
 * - computeWrappedImageHtml(): Generates wrapped picture element with LQIP
 *
 * PLACEHOLDER_MODE (env PLACEHOLDER_IMAGES=1): Skip processing for faster builds.
 * Image cache is copied to _site/img/ after Eleventy build completes.
 */
import fs from "node:fs";

/** @typedef {import("#lib/types").ImageProps} ImageProps */
/** @typedef {import("#lib/types").ComputeImageProps} ComputeImageProps */
import { PLACEHOLDER_MODE } from "#build/build-mode.js";
import { cropImage, getAspectRatio, getMetadata } from "#media/image-crop.js";
import { processExternalImage } from "#media/image-external.js";
import {
  getEleventyImg,
  LQIP_WIDTH,
  shouldGenerateLqip,
} from "#media/image-lqip.js";
import {
  generatePictureHtml,
  prepareLqipMetadata,
  processFormats,
  resolveOutput,
} from "#media/image-pipeline.js";
import { generatePlaceholderHtml } from "#media/image-placeholder.js";
import {
  buildWrapperStyles,
  filenameFormat,
  isExternalUrl,
  normalizeImagePath,
  parseWidths,
  prepareImageAttributes,
} from "#media/image-utils.js";
import { wrapImageHtml } from "#media/image-wrapper.js";
import { jsonKey, memoize } from "#toolkit/fp/memoize.js";
import { frozenObject } from "#toolkit/fp/object.js";

const DEFAULT_OPTIONS = frozenObject({
  outputDir: ".image-cache",
  urlPath: "/img/",
  svgShortCircuit: true,
  filenameFormat,
});

/**
 * Called from processAndWrapImage for local (non-external) images.
 * Receives imageName from two paths:
 * 1. From image-transform.js via extractImageOptions: getAttribute("src") = string | null
 * 2. From imageShortcode: template string = string
 *
 * Optimization: LQIP and responsive images are generated in a single eleventy-img call.
 * The 32px thumbnail for LQIP is included in the widths array, then extracted from
 * the resulting metadata and filtered out before generating HTML.
 *
 * Memoized to avoid reprocessing the same image with same options.
 * While eleventy-img disk-caches processed images, memoization avoids:
 * - Repeated disk I/O for LQIP base64 encoding
 * - Repeated eleventy-img cache checks
 * - Repeated HTML generation
 * Cache is bounded by maxCacheSize (default 2000) to prevent unbounded memory growth.
 *
 * @param {ComputeImageProps} props - Image processing properties
 * @returns {Promise<string>} Wrapped image HTML
 */
const computeWrappedImageHtml = memoize(
  async ({
    imageName,
    alt,
    classes,
    sizes,
    widths,
    aspectRatio,
    loading,
    noLqip = false,
    skipMaxWidth = false,
  }) => {
    if (PLACEHOLDER_MODE) {
      return generatePlaceholderHtml({
        alt,
        classes,
        sizes,
        loading,
        aspectRatio,
      });
    }

    const imagePath = normalizeImagePath(imageName);
    const metadata = await getMetadata(imagePath);
    const finalPath = await cropImage(aspectRatio, imagePath, metadata);

    const { imgAttributes, pictureAttributes } = prepareImageAttributes({
      alt,
      sizes,
      loading,
      classes,
    });
    const { default: Image } = await getEleventyImg();

    // Check if LQIP should be generated (skip for SVGs, small files, or if noLqip is set)
    const generateLqip = !noLqip && shouldGenerateLqip(finalPath, metadata);

    // Include LQIP width in the webp widths for single-pass processing
    const requestedWidths = parseWidths(widths);
    const webpWidths = generateLqip
      ? [LQIP_WIDTH, ...requestedWidths]
      : requestedWidths;

    const imageMetadata = await processFormats(
      Image,
      finalPath,
      { ...DEFAULT_OPTIONS, fixOrientation: true },
      webpWidths,
    );

    const { bgImage, htmlMetadata } = await prepareLqipMetadata(
      imageMetadata,
      generateLqip,
    );

    const innerHTML = await generatePictureHtml(
      htmlMetadata,
      imgAttributes,
      pictureAttributes,
    );

    return await wrapImageHtml(innerHTML, {
      classes,
      style: buildWrapperStyles(
        bgImage,
        aspectRatio,
        metadata,
        getAspectRatio,
        skipMaxWidth,
      ),
    });
  },
  { cacheKey: jsonKey },
);

/**
 * Called from two paths with different imageName types:
 * 1. From image-transform.js: extractImageOptions passes getAttribute("src") = string | null
 * 2. From imageShortcode: template syntax passes string directly
 *
 * @param {ImageProps} props - Image processing properties
 * @returns {Promise<string | Element>} Wrapped image HTML or Element
 */
const processAndWrapImage = async ({
  logName: _logName,
  returnElement = false,
  document = null,
  ...imageProps
}) => {
  if (isExternalUrl(imageProps.imageName)) {
    return await processExternalImage({
      src: imageProps.imageName,
      alt: imageProps.alt,
      loading: imageProps.loading,
      classes: imageProps.classes,
      sizes: imageProps.sizes,
      widths: imageProps.widths,
      aspectRatio: imageProps.aspectRatio,
      returnElement,
      document,
    });
  }

  const html = await computeWrappedImageHtml(imageProps);

  return resolveOutput(html, returnElement, document);
};

const configureImages = async (eleventyConfig) => {
  const imageFiles = ["src/images/*.jpg"].flatMap((pattern) => [
    ...new Bun.Glob(pattern).scanSync("."),
  ]);

  const { eleventyImageOnRequestDuringServePlugin } = await getEleventyImg();
  eleventyConfig.addPlugin(eleventyImageOnRequestDuringServePlugin);

  eleventyConfig.addAsyncShortcode("image", imageShortcode);
  eleventyConfig.addCollection("images", () =>
    imageFiles.map((i) => i.split("/")[2]).reverse(),
  );
  eleventyConfig.on("eleventy.after", () => {
    if (fs.existsSync(".image-cache/")) {
      fs.cpSync(".image-cache/", "_site/img/", { recursive: true });
    }
  });
};

/**
 * @param {string} imageName - The image name/path from Eleventy template
 * @param {string} alt
 * @param {string | string[]} [widths]
 * @param {string | null} [classes]
 * @param {string | null} [sizes]
 * @param {string | null} [aspectRatio]
 * @param {string | null} [loading]
 * @param {boolean} [noLqip]
 * @param {boolean} [skipMaxWidth] - Skip max-width constraint (for background images)
 */
const imageShortcode = async (
  imageName,
  alt,
  widths,
  classes = null,
  sizes = null,
  aspectRatio = null,
  loading = null,
  noLqip = false,
  skipMaxWidth = false,
) =>
  processAndWrapImage({
    logName: `imageShortcode: ${imageName}`,
    imageName,
    alt,
    classes,
    sizes,
    widths,
    aspectRatio,
    loading,
    noLqip,
    skipMaxWidth,
    returnElement: false,
  });

export { configureImages, imageShortcode, processAndWrapImage };
