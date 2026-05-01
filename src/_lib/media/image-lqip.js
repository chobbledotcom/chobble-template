/**
 * Low Quality Image Placeholder (LQIP) generation.
 *
 * Creates tiny base64-encoded 32px webp thumbnails for progressive image loading.
 * These are used as CSS background-image placeholders while the full image loads.
 *
 * Skips placeholder generation for:
 * - SVG images (vector, don't need placeholders)
 * - Images with any transparent pixels (placeholder would show through)
 * - Small images under 5KB (overhead not worth it)
 */
import { getSharp } from "#media/image-crop.js";
import { mapObject } from "#toolkit/fp/object.js";

// Node.js caches dynamic imports, no memoization needed
const getEleventyImg = () => import("@11ty/eleventy-img");

const LQIP_WIDTH = 32;
const PLACEHOLDER_SIZE_THRESHOLD = 5 * 1024;

/**
 * Check if LQIP should be generated for an image.
 * Skips SVGs, files under the size threshold, and any image with transparent
 * pixels (placeholder would show through). Sharp's stats() is only invoked
 * when the metadata reports an alpha channel.
 * @param {string} imagePath - Path to the image file
 * @param {{ format: string, hasAlpha?: boolean }} metadata - Image metadata from sharp
 * @returns {Promise<boolean>} Whether to generate LQIP
 */
const shouldGenerateLqip = async (imagePath, metadata) => {
  if (metadata.format === "svg") return false;
  if (Bun.file(imagePath).size < PLACEHOLDER_SIZE_THRESHOLD) return false;
  if (!metadata.hasAlpha) return true;
  const sharp = await getSharp();
  const stats = await sharp(imagePath).stats();
  return stats.isOpaque;
};

/**
 * Extract LQIP data URL from eleventy-img metadata.
 * Finds the 32px webp image and converts it to a base64 data URL.
 * Uses Bun.file().arrayBuffer() for faster binary file reading.
 * @param {{ webp?: Array<{ width: number, outputPath: string }> }} imageMetadata - Metadata returned by eleventy-img
 * @returns {Promise<string | null>} CSS url() with base64 data, or null if not found
 */
const extractLqipFromMetadata = async (imageMetadata) => {
  if (!imageMetadata.webp) return null;

  const lqipImage = imageMetadata.webp.find((img) => img.width === LQIP_WIDTH);
  if (!lqipImage) return null;

  const buffer = await Bun.file(lqipImage.outputPath).arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `url('data:image/webp;base64,${base64}')`;
};

/**
 * Filter out LQIP width from image metadata for HTML generation.
 * @param {Record<string, Array<{ width: number }>>} imageMetadata - Metadata returned by eleventy-img
 * @returns {Record<string, Array<{ width: number }>>} Filtered metadata without LQIP-sized images
 */
const removeLqip = mapObject((format, images) => [
  format,
  images.filter((img) => img.width !== LQIP_WIDTH),
]);

export {
  extractLqipFromMetadata,
  getEleventyImg,
  LQIP_WIDTH,
  removeLqip,
  shouldGenerateLqip,
};
