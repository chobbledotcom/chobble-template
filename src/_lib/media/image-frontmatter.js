/**
 * Image frontmatter validation functions
 *
 * Utilities for validating image paths specified in frontmatter.
 * Checks that images exist on disk or are valid external URLs.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { memoize } from "#utils/memoize.js";

// Memoize the file existence check since the same images are checked repeatedly
const checkImageExists = memoize((fullPath) => existsSync(fullPath));

/**
 * Validates an image path from frontmatter.
 * Returns true for valid external URLs or existing local files.
 * Throws an error if a local file path is provided but doesn't exist.
 *
 * @param {string | undefined} imagePath - Image path to validate
 * @returns {boolean} True if image is valid (external URL or exists on disk)
 * @throws {Error} If local file path doesn't exist
 */
export const isValidImage = (imagePath) => {
  if (!imagePath || imagePath.trim() === "") return false;
  if (imagePath.indexOf("http") === 0) return true;

  // Remove leading slash and strip "src/" prefix if present
  const relativePath = imagePath.replace(/^\//, "").replace(/^src\//, "");
  const fullPath = join(process.cwd(), "src", relativePath);

  if (checkImageExists(fullPath)) return true;

  throw new Error(`Image file not found: ${fullPath}`);
};

/**
 * Returns the first valid image from an array of candidates.
 *
 * @param {(string | undefined)[]} candidates - Array of image paths to check
 * @returns {string | undefined} First valid image path, or undefined if none found
 */
export const getFirstValidImage = (candidates) => candidates.find(isValidImage);
