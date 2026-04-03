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
  prepareLqipMetadata,
  processFormats,
  resolveOutput,
  wrapProcessedImage,
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
import { memoize } from "#toolkit/fp/memoize.js";
import { frozenObject } from "#toolkit/fp/object.js";

const DEFAULT_OPTIONS = frozenObject({
  outputDir: ".image-cache",
  urlPath: "/img/",
  svgShortCircuit: true,
  filenameFormat,
});

/**
 * Memoized image processing — the expensive part.
 *
 * Runs eleventy-img, LQIP generation, and cropping, then returns
 * intermediate data that can be combined with presentation attributes.
 * Cache key only includes image-processing fields (imageName, widths,
 * aspectRatio, noLqip, skipMaxWidth) so the same image with different
 * alt/classes/sizes/loading values shares cached results across pages.
 *
 * @param {ComputeImageProps} props - Image processing properties
 * @returns {Promise<{htmlMetadata: Object, style: string}>}
 */
const processImageData = memoize(
  async ({
    imageName,
    widths,
    aspectRatio,
    noLqip = false,
    skipMaxWidth = false,
  }) => {
    const imagePath = normalizeImagePath(imageName);
    const metadata = await getMetadata(imagePath);
    const finalPath = await cropImage(aspectRatio, imagePath, metadata);

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

    const style = buildWrapperStyles(
      bgImage,
      aspectRatio,
      metadata,
      getAspectRatio,
      skipMaxWidth,
    );

    return { htmlMetadata, style };
  },
  {
    cacheKey: (args) =>
      JSON.stringify(args[0], [
        "imageName",
        "widths",
        "aspectRatio",
        "noLqip",
        "skipMaxWidth",
      ]),
  },
);

/**
 * Generate wrapped image HTML from processing data + presentation attributes.
 *
 * Delegates expensive work to memoized processImageData, then applies
 * cheap presentation attributes (alt, classes, sizes, loading) to produce
 * the final HTML.
 *
 * @param {ComputeImageProps} props - Image processing properties
 * @returns {Promise<string>} Wrapped image HTML
 */
const computeWrappedImageHtml = async ({
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

  const { htmlMetadata, style } = await processImageData({
    imageName,
    widths,
    aspectRatio,
    noLqip,
    skipMaxWidth,
  });

  const { imgAttributes, pictureAttributes } = prepareImageAttributes({
    alt,
    sizes,
    loading,
    classes,
  });

  return await wrapProcessedImage(
    htmlMetadata,
    imgAttributes,
    pictureAttributes,
    {
      classes,
      style,
    },
  );
};

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
      skipMaxWidth: imageProps.skipMaxWidth,
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
 * Coerce a Liquid shortcode argument to string or null.
 * LiquidJS passes `null`/`nil` literals as empty objects `{}`,
 * so any non-string value is treated as null (use the default).
 * @param {unknown} value
 * @returns {string | null}
 */
const toStringOrNull = (value) =>
  typeof value === "string" && value ? value : null;

/**
 * Validate that a shortcode argument is a string.
 * Throws a build error if a non-string truthy value is passed
 * (catches LiquidJS `null` → `{}` bugs in templates).
 * @param {unknown} value
 * @param {string} name - Parameter name for error message
 * @param {string} imageName - Image being processed (for context)
 */
const assertStringOrFalsy = (value, name, imageName) => {
  if (value && typeof value !== "string") {
    throw new Error(
      `{% image %} shortcode: "${name}" must be a string, got ${typeof value} ` +
        `(value: ${JSON.stringify(value)}). Image: ${imageName}. ` +
        `Hint: LiquidJS converts \`null\` to \`{}\`. Use "" instead of null.`,
    );
  }
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
) => {
  assertStringOrFalsy(loading, "loading", imageName);
  assertStringOrFalsy(classes, "classes", imageName);
  assertStringOrFalsy(sizes, "sizes", imageName);
  assertStringOrFalsy(aspectRatio, "aspectRatio", imageName);

  return processAndWrapImage({
    logName: `imageShortcode: ${imageName}`,
    imageName,
    alt,
    classes: toStringOrNull(classes),
    sizes: toStringOrNull(sizes),
    widths,
    aspectRatio: toStringOrNull(aspectRatio),
    loading: toStringOrNull(loading),
    noLqip,
    skipMaxWidth,
    returnElement: false,
  });
};

export { configureImages, imageShortcode, processAndWrapImage };
