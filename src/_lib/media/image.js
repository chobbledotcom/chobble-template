import fs from "node:fs";
import { cropImage, getAspectRatio, getMetadata } from "#media/image-crop.js";
import {
  filenameFormat,
  getEleventyImg,
  getThumbnailOrNull,
} from "#media/image-lqip.js";
import { createImageTransform as createTransform } from "#media/image-transform.js";
import { compact } from "#utils/array-utils.js";
import { createElement, createHtml, parseHtml } from "#utils/dom-builder.js";
import { jsonKey, memoize } from "#utils/memoize.js";

// Image processing configuration
const DEFAULT_OPTIONS = {
  formats: ["webp", "jpeg"],
  outputDir: ".image-cache",
  urlPath: "/img/",
  svgShortCircuit: true,
  filenameFormat,
};

const DEFAULT_WIDTHS = [240, 480, 900, 1300, "auto"];
const DEFAULT_SIZE = "auto";

// Compute wrapped image HTML for local images (memoized)
/**
 * Called from processAndWrapImage for local (non-external) images.
 * Receives imageName from two paths:
 * 1. From image-transform.js via extractImageOptions: getAttribute("src") = string | null
 * 2. From imageShortcode: template string = string
 *
 * @param {Object} props
 * @param {string | null} props.imageName - Image src (may be null from getAttribute in transform)
 * @param {string | null} props.alt - From getAttribute or template
 * @param {string | null} [props.classes] - From getAttribute or template
 * @param {string | null} [props.sizes] - From getAttribute or template
 * @param {string | string[] | null} [props.widths] - From getAttribute or template
 * @param {string | null} [props.aspectRatio] - From getAttribute or template
 * @param {string | null} [props.loading] - From imageShortcode
 */
const computeWrappedImageHtml = memoize(
  async ({ imageName, alt, classes, sizes, widths, aspectRatio, loading }) => {
    // Path normalization for image sources
    // imageName is string | null: from getAttribute in transform path, string in shortcode path
    /** @type {string} */
    const name = imageName.toString();
    const imagePath = (() => {
      if (name.startsWith("/")) return `./src${name}`;
      if (name.startsWith("src/")) return `./${name}`;
      if (name.startsWith("images/")) return `./src/${name}`;
      return `./src/images/${name}`;
    })();

    const metadata = await getMetadata(imagePath);
    const finalPath = await cropImage(aspectRatio, imagePath, metadata);

    // Parse widths - handles string "240,480" or array
    const parsedWidths =
      typeof widths === "string" ? widths.split(",") : widths || DEFAULT_WIDTHS;

    // Generate responsive image HTML using eleventy-img
    const imgAttributes = {
      alt: alt || "",
      sizes: sizes || DEFAULT_SIZE,
      loading: loading || "lazy",
      decoding: "async",
    };

    const pictureAttributes = classes?.trim() ? { class: classes } : {};

    const { default: Image } = await getEleventyImg();

    // Run Image generation and thumbnail in parallel (they're independent operations)
    const [innerHTML, bgImage] = await Promise.all([
      Image(finalPath, {
        ...DEFAULT_OPTIONS,
        widths: parsedWidths,
        fixOrientation: true,
        returnType: "html",
        htmlOptions: { imgAttributes, pictureAttributes },
      }),
      getThumbnailOrNull(imagePath, metadata),
    ]);

    const styles = compact([
      bgImage && `background-image: ${bgImage}`,
      `aspect-ratio: ${getAspectRatio(aspectRatio, metadata)}`,
      metadata.width && `max-width: min(${metadata.width}px, 100%)`,
    ]);

    return await createHtml(
      "div",
      {
        class: classes ? `image-wrapper ${classes}` : "image-wrapper",
        style: styles.join("; "),
      },
      innerHTML,
    );
  },
  { cacheKey: jsonKey },
);

// Main image processing function
/**
 * Called from two paths with different imageName types:
 * 1. From image-transform.js: extractImageOptions passes getAttribute("src") = string | null
 * 2. From imageShortcode: template syntax passes string directly
 *
 * @param {Object} props
 * @param {string} [props.logName]
 * @param {string | null} props.imageName - Image src (string from shortcode, string|null from DOM getAttribute)
 * @param {string | null} props.alt - From getAttribute or shortcode
 * @param {string | null} [props.classes] - From getAttribute or shortcode
 * @param {string | null} [props.sizes] - From getAttribute or shortcode
 * @param {string | string[] | null} [props.widths] - From getAttribute or shortcode
 * @param {boolean} [props.returnElement] - true from transform, false from shortcode
 * @param {string | null} [props.aspectRatio] - From getAttribute or shortcode
 * @param {string | null} [props.loading] - Always null from transform, from shortcode param
 * @param {Document | null} [props.document] - Document object from transform, null from shortcode
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
  // Call toString() on imageName to handle potential null from DOM getAttribute in transform path
  // imageShortcode path: imageName is string from template, toString() is redundant but harmless
  // image-transform path: imageName may be null from getAttribute, toString() converts to "null"
  /** @type {string} */
  const imageNameStr = imageName.toString();

  // Check if URL is external
  if (
    imageNameStr.startsWith("http://") ||
    imageNameStr.startsWith("https://")
  ) {
    // Handle external URLs - simple img tag without processing
    const attributes = {
      src: imageNameStr,
      alt: alt || "",
      loading: loading || "lazy",
      decoding: "async",
      sizes: "auto",
    };
    if (classes) attributes.class = classes;

    return returnElement
      ? await createElement("img", attributes, null, document)
      : await createHtml("img", attributes);
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

// Create image transform - wraps the low-level transform with processAndWrapImage
const createImageTransform = () => createTransform(processAndWrapImage);

// Configure Eleventy with image processing
const configureImages = async (eleventyConfig) => {
  // Find image files matching patterns
  const imageFiles = ["src/images/*.jpg"].flatMap((pattern) => [
    ...new Bun.Glob(pattern).scanSync("."),
  ]);

  const { eleventyImageOnRequestDuringServePlugin } = await getEleventyImg();
  eleventyConfig.addPlugin(eleventyImageOnRequestDuringServePlugin);

  eleventyConfig.addAsyncShortcode("image", imageShortcode);
  eleventyConfig.addTransform("processImages", createImageTransform());
  // Create images collection for Eleventy
  eleventyConfig.addCollection("images", () =>
    (imageFiles ?? []).map((i) => i.split("/")[2]).reverse(),
  );
  // Copy image cache to output directory
  eleventyConfig.on("eleventy.after", () => {
    if (fs.existsSync(".image-cache/")) {
      fs.cpSync(".image-cache/", "_site/img/", { recursive: true });
    }
  });
};

// Image shortcode for use in templates
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

export { createImageTransform, configureImages, imageShortcode };
