/**
 * Image frontmatter validation functions
 *
 * Utilities for validating image paths specified in frontmatter.
 * Checks that images exist on disk or are valid external URLs.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SRC_DIR } from "#lib/paths.js";
import { memoize } from "#utils/fp/memoize.js";
import { isExternalUrl } from "#utils/url-utils.js";

// Memoize the file existence check since the same images are checked repeatedly
const checkImageExists = memoize(
  /** @param {string} fullPath */
  (fullPath) => existsSync(fullPath),
);

/**
 * Returns the first valid image from an array of candidates.
 *
 * @param {(string | null | undefined)[]} candidates - Array of image paths to check
 * @param {string} baseDir - Base src directory (defaults to SRC_DIR)
 * @returns {string | undefined} First valid image path, or undefined if none found
 * @throws {Error} If a local candidate doesn't exist before a valid image is found
 */
export const getFirstValidImage = (candidates, baseDir = SRC_DIR) =>
  candidates.find(
    /** @returns {imagePath is string} */ (imagePath) => {
      if (!imagePath || imagePath.trim() === "") return false;
      if (isExternalUrl(imagePath)) return true;

      // Remove leading slash and strip "src/" prefix if present
      const relativePath = imagePath.replace(/^\//, "").replace(/^src\//, "");
      const fullPath = join(baseDir, relativePath);

      if (checkImageExists(fullPath)) return true;

      throw new Error(`Image file not found: ${fullPath}`);
    },
  );
