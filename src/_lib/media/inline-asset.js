import fs from "node:fs";
import path from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { memberOf } from "#toolkit/fp/array.js";
import { memoize } from "#toolkit/fp/memoize.js";

const SVG_EXTENSIONS = [".svg"];
const IMAGE_EXTENSIONS = [".webp", ".jpeg", ".jpg", ".png", ".gif"];
const ALLOWED_EXTENSIONS = [...SVG_EXTENSIONS, ...IMAGE_EXTENSIONS];

const isSvgExtension = memberOf(SVG_EXTENSIONS);
const isAllowedExtension = memberOf(ALLOWED_EXTENSIONS);

/**
 * Memoized function to inline an asset file, returning its contents as a string.
 * For SVG files, returns the raw SVG text.
 * For images (webp, jpeg, png, gif), returns base64 data URI.
 * Cache is keyed by (assetPath, baseDir) to handle different base directories.
 *
 * Synchronous file reader with memoization -- files are only read once.
 *
 * @param {string} assetPath - Path relative to assets directory
 * @param {string} baseDir - Base directory (defaults to ROOT_DIR)
 * @returns {string} Inlined asset content
 * @throws {Error} If file doesn't exist or has unsupported extension
 */
export const memoizedInlineAsset = memoize(
  /**
   * @param {string} assetPath
   * @param {string} baseDir
   */
  (assetPath, baseDir = ROOT_DIR) => {
    const fullPath = path.join(baseDir, "src", "assets", assetPath);
    const ext = path.extname(assetPath).toLowerCase();

    if (!isAllowedExtension(ext)) {
      throw new Error(
        `Unsupported file extension "${ext}" for inline_asset. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`,
      );
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Asset file not found: ${assetPath}`);
    }

    if (isSvgExtension(ext)) {
      return fs.readFileSync(fullPath, "utf-8");
    }

    const imageBuffer = fs.readFileSync(fullPath);
    const base64 = imageBuffer.toString("base64");
    const mimeType = ext.slice(1) === "jpg" ? "jpeg" : ext.slice(1);
    return `data:image/${mimeType};base64,${base64}`;
  },
  { cacheKey: (args) => `${args[0]}|${args[1] || ROOT_DIR}` },
);

/**
 * Configure the inline_asset filter for Eleventy
 * @param {*} eleventyConfig - Eleventy configuration object
 */
export const configureInlineAsset = (eleventyConfig) => {
  eleventyConfig.addFilter("inline_asset", memoizedInlineAsset);
};
