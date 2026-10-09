/**
 * Image processing for Eleventy - wraps eleventy-img with cropping and LQIP.
 *
 * Entry points:
 * - configureImages(): Registers Eleventy plugin with shortcode and collection
 * - imageShortcode(): Template shortcode for manual image processing
 * - processAndWrapImage(): Main function for image processing (used by html-transform)
 *
 * Processing flow:
 * - processAndWrapImage(): routes each image to the placeholder, external
 *   (image-external.js), or local pipeline
 * - computeLocalImageHtml(): generates the wrapped picture element with LQIP
 *
 * PLACEHOLDER_MODE (env PLACEHOLDER_IMAGES=1): Skip processing for faster builds.
 * Image cache is copied to _site/img/ after Eleventy build completes.
 */
import fs from "node:fs";
import { globSync } from "tinyglobby";

/** @typedef {import("#lib/types").ImageProps} ImageProps */
/** @typedef {import("#lib/types").ComputeImageProps} ComputeImageProps */
import { PLACEHOLDER_MODE } from "#build/build-mode.js";
import {
  getAspectRatio,
  getCropImageOptions,
  getCropMaxWidth,
  getMetadata,
  sanitizeCropWidths,
} from "#media/image-crop.js";
import { computeExternalImageHtml } from "#media/image-external.js";
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
  buildImageWrapperStyles,
  DEFAULT_IMAGE_OPTIONS,
  getImageCacheDir,
  JPEG_FALLBACK_WIDTH,
  normalizeImagePath,
  normalizeImageUrl,
  parseWidths,
  prepareImageAttributes,
} from "#media/image-utils.js";
import { dedupeAsync, jsonKey } from "#utils/fp/memoize.js";
import { isExternalUrl } from "#utils/url-utils.js";

/**
 * Deduplicated image processing — the expensive part.
 *
 * Runs eleventy-img, LQIP generation, and cropping, then returns
 * intermediate data that can be combined with presentation attributes.
 * Only concurrent calls for the same processing tuple share work; settled
 * results are not retained, which avoids build-long memory growth for sites
 * with many distinct images.
 *
 * @param {ComputeImageProps} props - Image processing properties
 * @returns {Promise<{htmlMetadata: Object, style: string}>}
 */
const processImageData = dedupeAsync(
  async ({
    imageName,
    widths,
    aspectRatio,
    noLqip = false,
    skipMaxWidth = false,
  }) => {
    const imagePath = normalizeImagePath(imageName);
    const metadata = await getMetadata(imagePath);

    const { default: Image } = await getEleventyImg();

    // Check if LQIP should be generated (skip for SVGs, transparent images, small files, or if noLqip is set)
    const generateLqip =
      !noLqip && (await shouldGenerateLqip(imagePath, metadata));

    // Include LQIP width in the webp widths for single-pass processing
    const requestedWidths = parseWidths(widths);
    const requestedWebpWidths = generateLqip
      ? [LQIP_WIDTH, ...requestedWidths]
      : requestedWidths;
    const webpWidths = sanitizeCropWidths(
      requestedWebpWidths,
      aspectRatio,
      metadata,
    );
    const jpegWidths = sanitizeCropWidths(
      [JPEG_FALLBACK_WIDTH],
      aspectRatio,
      metadata,
    );

    const imageMetadata = await processFormats(
      Image,
      imagePath,
      {
        ...DEFAULT_IMAGE_OPTIONS,
        svgShortCircuit: true,
        fixOrientation: true,
        ...getCropImageOptions(aspectRatio),
      },
      webpWidths,
      jpegWidths,
    );

    const { bgImage, htmlMetadata } = await prepareLqipMetadata(
      imageMetadata,
      generateLqip,
    );

    const style = buildImageWrapperStyles({
      bgImage,
      aspectRatio: getAspectRatio(aspectRatio, metadata),
      maxWidth: getCropMaxWidth(aspectRatio, metadata),
      skipMaxWidth,
    });

    return { htmlMetadata, style };
  },
  { cacheKey: jsonKey },
);

/**
 * Called from two paths with different imageName types:
 * 1. From transforms/images.js: extractImageOptions passes getAttribute("src") = string | null
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
  const computeHtml = () => {
    if (PLACEHOLDER_MODE) return generatePlaceholderHtml(imageProps);
    if (isExternalUrl(imageProps.imageName)) {
      return computeExternalImageHtml(imageProps);
    }
    return computeLocalImageHtml(imageProps);
  };
  return resolveOutput(await computeHtml(), returnElement, document);
};

/**
 * Generate wrapped image HTML for a local image.
 *
 * Delegates expensive work to deduplicated processImageData, then applies
 * cheap presentation attributes (alt, classes, sizes, loading) to produce
 * the final HTML.
 *
 * @param {ComputeImageProps} props - Image processing properties
 * @returns {Promise<string>} Wrapped image HTML
 */
const computeLocalImageHtml = async ({
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

  return wrapProcessedImage(htmlMetadata, imgAttributes, pictureAttributes, {
    classes,
    style,
  });
};

/** @param {import("#lib/types").UserConfig} eleventyConfig */
const configureImages = async (eleventyConfig) => {
  const imageFiles = ["src/images/*.jpg"].flatMap((pattern) =>
    globSync(pattern, { cwd: "." }),
  );

  const { eleventyImageOnRequestDuringServePlugin } = await getEleventyImg();
  eleventyConfig.addPlugin(eleventyImageOnRequestDuringServePlugin);

  eleventyConfig.addAsyncShortcode("image", imageShortcode);
  eleventyConfig.addFilter("normalizeImageUrl", normalizeImageUrl);
  eleventyConfig.addCollection("images", () =>
    imageFiles.map((i) => i.split("/")[2]).reverse(),
  );
  eleventyConfig.on("eleventy.after", () => {
    const cacheDir = getImageCacheDir();
    if (fs.existsSync(cacheDir)) {
      fs.cpSync(`${cacheDir}/`, "_site/img/", { recursive: true });
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
