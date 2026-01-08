import fs from "node:fs";
import path from "node:path";
import { memoize } from "#utils/memoize.js";

const ALLOWED_SVG_EXTENSIONS = [".svg"];
const ALLOWED_IMAGE_EXTENSIONS = [".webp", ".jpeg", ".jpg", ".png", ".gif"];
const ALLOWED_EXTENSIONS = [
  ...ALLOWED_SVG_EXTENSIONS,
  ...ALLOWED_IMAGE_EXTENSIONS,
];

/**
 * Get the full path to an asset file
 * @param {string} assetPath - Path relative to assets directory
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {string} Full path to the asset
 */
const getAssetPath = (assetPath, baseDir = process.cwd()) =>
  path.join(baseDir, "src", "assets", assetPath);

/**
 * Check if a file extension is allowed for inlining
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if extension is allowed
 */
const isAllowedExtension = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
};

/**
 * Check if a file is an SVG
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file is an SVG
 */
const isSvgFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_SVG_EXTENSIONS.includes(ext);
};

/**
 * Check if a file is an image (non-SVG)
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file is an image
 */
const isImageFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
};

/**
 * Inline an asset file, returning its contents as a string
 * For SVG files, returns the raw SVG text
 * For images (webp, jpeg, png, gif), returns base64 data URI
 * @param {string} assetPath - Path relative to assets directory
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {string} Inlined asset content
 * @throws {Error} If file doesn't exist or has unsupported extension
 */
export function inlineAsset(assetPath, baseDir = process.cwd()) {
  const fullPath = getAssetPath(assetPath, baseDir);

  if (!isAllowedExtension(assetPath)) {
    const ext = path.extname(assetPath).toLowerCase();
    throw new Error(
      `Unsupported file extension "${ext}" for inline_asset. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`,
    );
  }

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Asset file not found: ${assetPath}`);
  }

  if (isSvgFile(assetPath)) {
    return fs.readFileSync(fullPath, "utf-8");
  }

  if (isImageFile(assetPath)) {
    const imageBuffer = fs.readFileSync(fullPath);
    const base64 = imageBuffer.toString("base64");
    const ext = path.extname(assetPath).toLowerCase().slice(1);
    const mimeType = ext === "jpg" ? "jpeg" : ext;
    return `data:image/${mimeType};base64,${base64}`;
  }

  throw new Error(`Unsupported file type: ${assetPath}`);
}

/**
 * Configure the inline_asset filter for Eleventy
 * @param {object} eleventyConfig - Eleventy configuration object
 */
export function configureInlineAsset(eleventyConfig) {
  eleventyConfig.addFilter("inline_asset", memoize(inlineAsset));
}
