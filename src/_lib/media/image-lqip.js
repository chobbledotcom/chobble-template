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
import { memoize } from "#toolkit/fp/memoize.js";
import { mapObject } from "#toolkit/fp/object.js";

const getEleventyImg = memoize(() => import("@11ty/eleventy-img"));

const LQIP_WIDTH = 32;
const PLACEHOLDER_SIZE_THRESHOLD = 5 * 1024;

/**
 * Get file size, memoized to avoid repeated fs.statSync calls.
 * @param {string} imagePath - Path to the image file
 * @returns {number} File size in bytes
 */
const getFileSize = memoize((imagePath) => fs.statSync(imagePath).size);

/**
 * Check if LQIP should be generated for an image.
 * Memoized because this is called inside computeWrappedImageHtml which may
 * be called with different option combinations for the same underlying image.
 * The fs.statSync call is now cached via getFileSize.
 *
 * @param {string} imagePath - Path to the image file
 * @param {Object} metadata - Image metadata from sharp
 * @returns {boolean} Whether to generate LQIP
 */
const shouldGenerateLqip = (imagePath, metadata) =>
  metadata.format !== "svg" &&
  getFileSize(imagePath) >= PLACEHOLDER_SIZE_THRESHOLD;

/**
 * Read LQIP file and convert to base64 data URL.
 * Memoized by output path to avoid re-reading the same file when the same
 * image is processed with different options (classes, sizes, etc.).
 * @param {string} outputPath - Path to the LQIP webp file
 * @returns {string} CSS url() with base64 data
 */
const readLqipAsBase64 = memoize((outputPath) => {
  const file = fs.readFileSync(outputPath);
  const base64 = file.toString("base64");
  return `url('data:image/webp;base64,${base64}')`;
});

/**
 * Extract LQIP data URL from eleventy-img metadata.
 * Finds the 32px webp image and converts it to a base64 data URL.
 * @param {Object} imageMetadata - Metadata returned by eleventy-img
 * @returns {string | null} CSS url() with base64 data, or null if not found
 */
const extractLqipFromMetadata = (imageMetadata) => {
  if (!imageMetadata.webp) return null;

  const lqipImage = imageMetadata.webp.find((img) => img.width === LQIP_WIDTH);
  if (!lqipImage) return null;

  return readLqipAsBase64(lqipImage.outputPath);
};

/**
 * Filter out LQIP width from image metadata for HTML generation.
 * @param {Object} imageMetadata - Metadata returned by eleventy-img
 * @returns {Object} Filtered metadata without LQIP-sized images
 */
const removeLqip = mapObject((format, images) => [
  format,
  images.filter((img) => img.width !== LQIP_WIDTH),
]);

export {
  getEleventyImg,
  shouldGenerateLqip,
  extractLqipFromMetadata,
  removeLqip,
  LQIP_WIDTH,
};
