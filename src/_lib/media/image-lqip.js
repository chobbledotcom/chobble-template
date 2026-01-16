/**
 * Low Quality Image Placeholder (LQIP) generation.
 *
 * Creates tiny base64-encoded 32px webp thumbnails for progressive image loading.
 * These are used as CSS background-image placeholders while the full image loads.
 *
 * Skips placeholder generation for:
 * - SVG images (vector, don't need placeholders)
 * - Small images under 5KB (overhead not worth it)
 */
import fs from "node:fs";
import path from "node:path";
import { memoize } from "#utils/memoize.js";

const getEleventyImg = memoize(() => import("@11ty/eleventy-img"));

/**
 * Converts a file path to a unique, filename-safe basename.
 * Strips common prefixes (./src/, src/) and the images/ directory name,
 * then converts remaining path segments to hyphen-separated format.
 *
 * E.g., "./src/images/products/photo.jpg" -> "products-photo"
 *       "./src/images/photo.jpg" -> "photo"
 *       "./src/assets/icons/logo.png" -> "assets-icons-logo"
 */
const getPathAwareBasename = (src) => {
  const normalized = src
    .replace(/\\/g, "/")
    .replace(/^\.?\/?(src\/)?/, "")
    .replace(/^images\//, "");
  const withoutExt = normalized.replace(/\.[^.]+$/, "");
  return withoutExt.replace(/\//g, "-");
};

const filenameFormat = (_id, src, width, format) => {
  const basename = getPathAwareBasename(src);
  return `${basename}-${width}.${format}`;
};

const THUMBNAIL_OPTIONS = {
  formats: ["webp"],
  outputDir: ".image-cache",
  urlPath: "/img/",
  svgShortCircuit: true,
  widths: [32],
  filenameFormat,
};

const PLACEHOLDER_SIZE_THRESHOLD = 5 * 1024;

const generateThumbnail = memoize(async (imagePath) => {
  const { default: Image } = await getEleventyImg();
  const thumbnails = await Image(imagePath, THUMBNAIL_OPTIONS);
  const [thumbnail] = thumbnails.webp;
  const file = fs.readFileSync(thumbnail.outputPath);
  const base64 = file.toString("base64");
  return `url('data:image/webp;base64,${base64}')`;
});

const getThumbnailOrNull = (imagePath, metadata) =>
  metadata.format === "svg" ||
  fs.statSync(imagePath).size < PLACEHOLDER_SIZE_THRESHOLD
    ? null
    : generateThumbnail(imagePath);

export {
  getThumbnailOrNull,
  getEleventyImg,
  filenameFormat,
  getPathAwareBasename,
};
