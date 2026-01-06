// Low Quality Image Placeholder (LQIP) generation
// Creates tiny base64-encoded thumbnails for progressive image loading

import fs from "node:fs";
import path from "node:path";
import { createLazyLoader } from "#utils/lazy-loader.js";
import { memoize } from "#utils/memoize.js";

// Lazy-load eleventy-img (heavy dependency)
const getEleventyImg = createLazyLoader("@11ty/eleventy-img");

// Shared filename format for eleventy-img output
const filenameFormat = (_id, src, width, format) => {
  const basename = path.basename(src, path.extname(src));
  return `${basename}-${width}.${format}`;
};

// Shared options for thumbnail generation
const THUMBNAIL_OPTIONS = {
  formats: ["webp"],
  outputDir: ".image-cache",
  urlPath: "/img/",
  svgShortCircuit: true,
  widths: [32],
  filenameFormat,
};

// Minimum file size to bother with a placeholder (5KB)
const PLACEHOLDER_SIZE_THRESHOLD = 5 * 1024;

// Check if image should skip placeholder generation
// SVGs don't need placeholders (vector), small images aren't worth the overhead
const shouldSkipPlaceholder = (metadata, fileSizeBytes) =>
  metadata.format === "svg" || fileSizeBytes < PLACEHOLDER_SIZE_THRESHOLD;

// Generate a base64 data URL for a tiny thumbnail
const generateThumbnail = memoize(async (imagePath) => {
  const { default: Image } = await getEleventyImg();
  const thumbnails = await Image(imagePath, THUMBNAIL_OPTIONS);
  const [thumbnail] = thumbnails.webp;
  const file = fs.readFileSync(thumbnail.outputPath);
  const base64 = file.toString("base64");
  return `url('data:image/webp;base64,${base64}')`;
});

// Get file size (memoized for performance)
const getFileSize = memoize((filePath) => fs.statSync(filePath).size);

// Get thumbnail or null if not needed
// Returns null for SVGs or small files, otherwise generates and returns base64 thumbnail
const getThumbnailOrNull = (imagePath, metadata) =>
  shouldSkipPlaceholder(metadata, getFileSize(imagePath))
    ? null
    : generateThumbnail(imagePath);

export {
  shouldSkipPlaceholder,
  generateThumbnail,
  getFileSize,
  getThumbnailOrNull,
  getEleventyImg,
  filenameFormat,
  THUMBNAIL_OPTIONS,
};
