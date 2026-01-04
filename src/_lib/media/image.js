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

// Path normalization for image sources
const getPath = (imageName) => {
  const name = imageName.toString();
  if (name.startsWith("/")) return `./src${name}`;
  if (name.startsWith("src/")) return `./${name}`;
  if (name.startsWith("images/")) return `./src/${name}`;
  return `./src/images/${name}`;
};

// Parse widths - handles string "240,480" or array
const getWidths = (widths) =>
  typeof widths === "string" ? widths.split(",") : widths || DEFAULT_WIDTHS;

// Generate responsive image HTML using eleventy-img
const getImageHtml = async (
  imagePath,
  widths,
  alt,
  sizes,
  loading,
  classes,
) => {
  const imgAttributes = {
    alt: alt || "",
    sizes: sizes || DEFAULT_SIZE,
    loading: loading || "lazy",
    decoding: "async",
  };

  const pictureAttributes = classes?.trim() ? { class: classes } : {};

  const { default: Image } = await getEleventyImg();
  return Image(imagePath, {
    ...DEFAULT_OPTIONS,
    widths,
    fixOrientation: true,
    returnType: "html",
    htmlOptions: { imgAttributes, pictureAttributes },
  });
};

// Build wrapper div with LQIP background and aspect ratio
const makeDivHtml = async (
  classes,
  thumbPromise,
  aspectRatio,
  maxWidth,
  innerHTML,
) => {
  const bgImage = thumbPromise !== null ? await thumbPromise : null;
  const styles = compact([
    bgImage && `background-image: ${bgImage}`,
    `aspect-ratio: ${aspectRatio}`,
    maxWidth && `max-width: min(${maxWidth}px, 100%)`,
  ]);

  return await createHtml(
    "div",
    {
      class: classes ? `image-wrapper ${classes}` : "image-wrapper",
      style: styles.join("; "),
    },
    innerHTML,
  );
};

// Compute wrapped image HTML for local images (memoized)
const computeWrappedImageHtml = memoize(
  async ({ imageName, alt, classes, sizes, widths, aspectRatio, loading }) => {
    const imagePath = getPath(imageName);
    const metadata = await getMetadata(imagePath);
    const finalPath = await cropImage(aspectRatio, imagePath, metadata);

    const innerHTML = await getImageHtml(
      finalPath,
      getWidths(widths),
      alt,
      sizes,
      loading,
      classes,
    );

    return await makeDivHtml(
      classes,
      getThumbnailOrNull(imagePath, metadata),
      getAspectRatio(aspectRatio, metadata),
      metadata.width,
      innerHTML,
    );
  },
  { cacheKey: jsonKey },
);

// Handle external URLs - simple img tag without processing
const handleExternalUrl = async (
  imageNameStr,
  alt,
  loading,
  classes,
  returnElement,
  document,
) => {
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
};

// Check if URL is external
const isExternalUrl = (url) =>
  url.startsWith("http://") || url.startsWith("https://");

// Main image processing function
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
  const imageNameStr = imageName.toString();

  if (isExternalUrl(imageNameStr)) {
    return await handleExternalUrl(
      imageNameStr,
      alt,
      loading,
      classes,
      returnElement,
      document,
    );
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

// Find image files matching patterns
const findImageFiles = (patterns = ["src/images/*.jpg"]) =>
  patterns.flatMap((pattern) => [...new Bun.Glob(pattern).scanSync(".")]);

// Create images collection for Eleventy
const createImagesCollection = (imageFiles) =>
  (imageFiles ?? []).map((i) => i.split("/")[2]).reverse();

// Copy image cache to output directory
const copyImageCache = () => {
  if (fs.existsSync(".image-cache/")) {
    fs.cpSync(".image-cache/", "_site/img/", { recursive: true });
  }
};

// Create image transform - wraps the low-level transform with processAndWrapImage
const createImageTransform = () => createTransform(processAndWrapImage);

// Configure Eleventy with image processing
const configureImages = async (eleventyConfig) => {
  const imageFiles = findImageFiles();

  const { eleventyImageOnRequestDuringServePlugin } = await getEleventyImg();
  eleventyConfig.addPlugin(eleventyImageOnRequestDuringServePlugin);

  eleventyConfig.addAsyncShortcode("image", imageShortcode);
  eleventyConfig.addTransform("processImages", createImageTransform());
  eleventyConfig.addCollection("images", () =>
    createImagesCollection(imageFiles),
  );
  eleventyConfig.on("eleventy.after", copyImageCache);
};

// Image shortcode for use in templates
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

export {
  findImageFiles,
  createImagesCollection,
  copyImageCache,
  createImageTransform,
  configureImages,
  imageShortcode,
};
