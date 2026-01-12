// Low Quality Image Placeholder (LQIP) generation
// Creates tiny base64-encoded thumbnails for progressive image loading

import fs from "node:fs";
import path from "node:path";
import { memoize } from "#utils/memoize.js";

const getEleventyImg = memoize(() => import("@11ty/eleventy-img"));

// Shared filename format for eleventy-img output
const filenameFormat = (_id, src, width, format) => {
  const basename = path.basename(src, path.extname(src));
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

// Minimum file size to bother with a placeholder (5KB)
const PLACEHOLDER_SIZE_THRESHOLD = 5 * 1024;

const generateThumbnail = memoize(async (imagePath) => {
  const { default: Image } = await getEleventyImg();
  const thumbnails = await Image(imagePath, THUMBNAIL_OPTIONS);
  const [thumbnail] = thumbnails.webp;
  const file = fs.readFileSync(thumbnail.outputPath);
  const base64 = file.toString("base64");
  return `url('data:image/webp;base64,${base64}')`;
});

// SVGs don't need placeholders (vector), small images aren't worth the overhead
const getThumbnailOrNull = (imagePath, metadata) =>
  metadata.format === "svg" ||
  fs.statSync(imagePath).size < PLACEHOLDER_SIZE_THRESHOLD
    ? null
    : generateThumbnail(imagePath);

export { getThumbnailOrNull, getEleventyImg, filenameFormat };
