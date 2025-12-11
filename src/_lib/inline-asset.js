import fs from "fs";
import path from "path";

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
export function getAssetPath(assetPath, baseDir = process.cwd()) {
  return path.join(baseDir, "src", "assets", assetPath);
}

/**
 * Check if a file extension is allowed for inlining
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if extension is allowed
 */
export function isAllowedExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Check if a file is an SVG
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file is an SVG
 */
export function isSvgFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_SVG_EXTENSIONS.includes(ext);
}

/**
 * Check if a file is an image (non-SVG)
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file is an image
 */
export function isImageFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
}

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

  // For images, return base64 data URI (to be implemented later)
  throw new Error("Image inlining not yet implemented");
}

/**
 * Configure the inline_asset filter for Eleventy
 * @param {object} eleventyConfig - Eleventy configuration object
 */
export function configureInlineAsset(eleventyConfig) {
  eleventyConfig.addFilter("inline_asset", (assetPath) => {
    return inlineAsset(assetPath);
  });
}
