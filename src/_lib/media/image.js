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
 * - computeWrappedImageHtml(): Memoized, generates wrapped picture element with LQIP
 *
 * PLACEHOLDER_MODE (env PLACEHOLDER_IMAGES=1): Skip processing for faster builds.
 * Image cache is copied to _site/img/ after Eleventy build completes.
 */
import fs from "node:fs";

/** @typedef {import("#lib/types").ImageProps} ImageProps */
/** @typedef {import("#lib/types").ComputeImageProps} ComputeImageProps */
import { cropImage, getAspectRatio, getMetadata } from "#media/image-crop.js";
import { processExternalImage } from "#media/image-external.js";
import { getEleventyImg, getThumbnailOrNull } from "#media/image-lqip.js";
import { generatePlaceholderHtml } from "#media/image-placeholder.js";
import {
  buildImgAttributes,
  buildWrapperStyles,
  filenameFormat,
  isExternalUrl,
  normalizeImagePath,
  parseWidths,
} from "#media/image-utils.js";
import { createHtml, parseHtml } from "#utils/dom-builder.js";
import { jsonKey, memoize } from "#utils/memoize.js";

const PLACEHOLDER_MODE = process.env.PLACEHOLDER_IMAGES === "1";

const DEFAULT_OPTIONS = {
  formats: ["webp", "jpeg"],
  outputDir: ".image-cache",
  urlPath: "/img/",
  svgShortCircuit: true,
  filenameFormat,
};

/**
 * Called from processAndWrapImage for local (non-external) images.
 * Receives imageName from two paths:
 * 1. From image-transform.js via extractImageOptions: getAttribute("src") = string | null
 * 2. From imageShortcode: template string = string
 *
 * @param {ComputeImageProps} props - Image processing properties
 * @returns {Promise<string>} Wrapped image HTML
 */
const computeWrappedImageHtml = memoize(
  async ({ imageName, alt, classes, sizes, widths, aspectRatio, loading }) => {
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

    const imgAttributes = buildImgAttributes({ alt, sizes, loading });
    const pictureAttributes = classes?.trim() ? { class: classes } : {};
    const { default: Image } = await getEleventyImg();

    const [innerHTML, bgImage] = await Promise.all([
      Image(finalPath, {
        ...DEFAULT_OPTIONS,
        widths: parseWidths(widths),
        fixOrientation: true,
        returnType: "html",
        htmlOptions: { imgAttributes, pictureAttributes },
      }),
      getThumbnailOrNull(finalPath, metadata),
    ]);

    return await createHtml(
      "div",
      {
        class: classes ? `image-wrapper ${classes}` : "image-wrapper",
        style: buildWrapperStyles(
          bgImage,
          aspectRatio,
          metadata,
          getAspectRatio,
        ),
      },
      innerHTML,
    );
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
  imageName,
  alt,
  classes,
  sizes = null,
  widths = null,
  returnElement = false,
  aspectRatio = null,
  loading = null,
  document = null,
}) => {
  if (isExternalUrl(imageName)) {
    return await processExternalImage({
      src: imageName,
      alt,
      loading,
      classes,
      returnElement,
      document,
    });
  }

  const html = await computeWrappedImageHtml({
    imageName,
    alt,
    classes,
    sizes,
    widths,
    aspectRatio,
    loading,
  });

  return returnElement ? await parseHtml(html, document) : html;
};

const configureImages = async (eleventyConfig) => {
  const imageFiles = ["src/images/*.jpg"].flatMap((pattern) => [
    ...new Bun.Glob(pattern).scanSync("."),
  ]);

  const { eleventyImageOnRequestDuringServePlugin } = await getEleventyImg();
  eleventyConfig.addPlugin(eleventyImageOnRequestDuringServePlugin);

  eleventyConfig.addAsyncShortcode("image", imageShortcode);
  eleventyConfig.addCollection("images", () =>
    (imageFiles ?? []).map((i) => i.split("/")[2]).reverse(),
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
 */
const imageShortcode = async (
  imageName,
  alt,
  widths,
  classes = null,
  sizes = null,
  aspectRatio = null,
  loading = null,
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
    returnElement: false,
  });

export { configureImages, imageShortcode, processAndWrapImage };
