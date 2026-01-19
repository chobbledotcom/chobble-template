/**
 * Image utility functions
 *
 * Helpers for image path normalization, URL detection, and attribute building.
 * Extracted to reduce complexity in image.js and provide reusable utilities.
 */
import { compact } from "#toolkit/fp/array.js";

const DEFAULT_WIDTHS = [240, 480, 900, 1300];
const DEFAULT_SIZE = "auto";

/**
 * Normalize image path to resolve from project root.
 * Handles various input formats:
 * - "/images/photo.jpg" -> "./src/images/photo.jpg"
 * - "src/images/photo.jpg" -> "./src/images/photo.jpg"
 * - "images/photo.jpg" -> "./src/images/photo.jpg"
 * - "photo.jpg" -> "./src/images/photo.jpg"
 *
 * @param {string} imageName - Image path (always string from shortcode or transform)
 * @returns {string} Normalized path
 */
export const normalizeImagePath = (imageName) => {
  if (imageName.startsWith("/")) return `./src${imageName}`;
  if (imageName.startsWith("src/")) return `./${imageName}`;
  if (imageName.startsWith("images/")) return `./src/${imageName}`;
  return `./src/images/${imageName}`;
};

/**
 * Check if URL is external (http:// or https://).
 */
export const isExternalUrl = (url) =>
  url.startsWith("http://") || url.startsWith("https://");

/**
 * Parse widths parameter and add "auto" for original source image.
 * Handles comma-separated string "240,480,900" or array [240, 480, 900].
 * Always appends "auto" to include the original source image.
 */
export const parseWidths = (widths) => {
  const parsed =
    typeof widths === "string" ? widths.split(",") : widths || DEFAULT_WIDTHS;
  return [...parsed, "auto"];
};

/**
 * Build standard image attributes object.
 * @param {Object} options - Attribute options
 * @param {string | null} [options.src] - Image source (for external images)
 * @param {string | null} [options.alt] - Alt text
 * @param {string | null} [options.sizes] - Sizes attribute
 * @param {string | null} [options.loading] - Loading attribute
 * @param {string | null} [options.classes] - CSS classes
 * @returns {Record<string, string>} Image attributes
 */
export const buildImgAttributes = ({
  src = null,
  alt = null,
  sizes = null,
  loading = null,
  classes = null,
} = {}) => ({
  ...(src && { src }),
  alt: alt || "",
  sizes: sizes || DEFAULT_SIZE,
  loading: loading || "lazy",
  decoding: "async",
  ...(classes && { class: classes }),
});

/**
 * Build wrapper styles for responsive images.
 * Creates CSS style string with background image, aspect ratio, and max-width.
 */
export const buildWrapperStyles = (
  bgImage,
  aspectRatio,
  metadata,
  getAspectRatioFn,
) =>
  compact([
    bgImage && `background-image: ${bgImage}`,
    `aspect-ratio: ${getAspectRatioFn(aspectRatio, metadata)}`,
    metadata.width && `max-width: min(${metadata.width}px, 100%)`,
  ]).join("; ");

/**
 * Converts a file path to a unique, filename-safe basename.
 * Strips common prefixes (./src/, src/) and the images/ directory name,
 * then converts remaining path segments to hyphen-separated format.
 *
 * E.g., "./src/images/products/photo.jpg" -> "products-photo"
 *       "./src/images/photo.jpg" -> "photo"
 *       "./src/assets/icons/logo.png" -> "assets-icons-logo"
 */
export const getPathAwareBasename = (src) => {
  const normalized = src
    .replace(/\\/g, "/")
    .replace(/^\.?\/?(src\/)?/, "")
    .replace(/^images\//, "");
  const withoutExt = normalized.replace(/\.[^.]+$/, "");
  return withoutExt.replace(/\//g, "-");
};

/**
 * Generate filename for resized images.
 * Used by eleventy-img for both regular images and LQIP thumbnails.
 */
export const filenameFormat = (_id, src, width, format) => {
  const basename = getPathAwareBasename(src);
  return `${basename}-${width}.${format}`;
};
