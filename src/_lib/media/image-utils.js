/**
 * Image utility functions
 *
 * Helpers for image path normalization, URL detection, and attribute building.
 * Extracted to reduce complexity in image.js and provide reusable utilities.
 */
import { compact } from "#utils/fp/array.js";
import { frozenObject } from "#utils/fp/object.js";
import { isExternalUrl } from "#utils/url-utils.js";

const DEFAULT_WIDTHS = [240, 480, 900, 1300];
const DEFAULT_SIZE = "auto";

/**
 * Resolve the processed-image cache directory at call time. The
 * IMAGE_CACHE_DIR environment variable redirects it so in-process test runs
 * write to a swept temp directory instead of seeding the checkout's build
 * cache, which every site build ships into `_site/img/`. Spawned test-site
 * builds blank it to keep their cache site-local.
 * @returns {string} Cache directory, cwd-relative by default
 */
export const getImageCacheDir = () =>
  process.env.IMAGE_CACHE_DIR || ".image-cache";

/**
 * Reduce an accepted image reference to a src/-relative path. The single
 * source of truth for the input shapes image references may take:
 * - "/images/photo.jpg", "src/images/photo.jpg", "images/photo.jpg", and
 *   "photo.jpg" all become "images/photo.jpg"
 * - explicitly rooted non-image paths keep their own directory
 *   ("/files/photo.png" -> "files/photo.png")
 *
 * @param {string} imageName - Image path as written in frontmatter/templates
 * @returns {string} Path relative to src/, without a leading slash
 */
const toSrcRelative = (imageName) => {
  if (imageName.startsWith("/")) return imageName.slice(1);
  if (imageName.startsWith("src/")) return imageName.slice(4);
  if (imageName.startsWith("images/")) return imageName;
  return `images/${imageName}`;
};

/**
 * Normalize image path to resolve from project root
 * (e.g. "photo.jpg" -> "./src/images/photo.jpg").
 * @param {string} imageName - Image path (always string from shortcode or transform)
 * @returns {string} Normalized path
 */
export const normalizeImagePath = (imageName) =>
  `./src/${toSrcRelative(imageName)}`;

/**
 * Normalize an image path to a browser URL rooted at the site
 * (e.g. "photo.jpg" -> "/images/photo.jpg").
 * External URLs (http:, https:, protocol-relative //, data:) pass through.
 * @param {string} imageName - Image path as written in frontmatter
 * @returns {string} Browser-safe URL
 */
export const normalizeImageUrl = (imageName) => {
  if (isExternalUrl(imageName)) return imageName;
  if (imageName.startsWith("//") || imageName.startsWith("data:"))
    return imageName;
  return `/${toSrcRelative(imageName)}`;
};

/**
 * Parse widths parameter and add "auto" for original source image.
 * Handles comma-separated string "240,480,900" or array [240, 480, 900].
 * Always appends "auto" to include the original source image.
 * @param {string | Array<string | number> | null} [widths] - Widths as CSV string or array
 */
export const parseWidths = (widths) => {
  const parsed =
    typeof widths === "string"
      ? widths.split(",").filter(Boolean)
      : widths || DEFAULT_WIDTHS;
  const result = parsed.length > 0 ? parsed : DEFAULT_WIDTHS;
  return [...result, "auto"];
};

/**
 * Build wrapper styles for images from pre-computed values.
 * Shared by both local and external image processing paths.
 * @param {Object} options
 * @param {string | null} options.bgImage - LQIP background image CSS value
 * @param {string | null} [options.aspectRatio] - Pre-computed aspect ratio string
 * @param {number | null} [options.maxWidth] - Maximum width in pixels
 * @param {boolean} [options.skipMaxWidth] - Skip max-width constraint
 * @returns {string} CSS style string
 */
export const buildImageWrapperStyles = ({
  bgImage,
  aspectRatio,
  maxWidth,
  skipMaxWidth = false,
}) =>
  compact([
    bgImage && `background-image: ${bgImage}`,
    aspectRatio && `aspect-ratio: ${aspectRatio}`,
    !skipMaxWidth && maxWidth && `max-width: min(${maxWidth}px, 100%)`,
  ]).join("; ");

// JPEG fallback width - only generate one JPEG size since nearly all browsers support webp
export const JPEG_FALLBACK_WIDTH = 1300;

/**
 * Default options for eleventy-img processing.
 * Shared between local and external image processing — the single source of
 * truth for the cache directory and URL path. The cache directory resolves
 * through getImageCacheDir at import time, after test setup has had its say.
 */
export const DEFAULT_IMAGE_OPTIONS = frozenObject({
  outputDir: getImageCacheDir(),
  urlPath: "/img/",
  /**
   * Generate filenames for resized images and LQIP thumbnails.
   * Strip src/images and cache prefixes; preserve subdirectories as hyphens.
   * @param {string} _id - Image ID (unused)
   * @param {string} src - Source path
   * @param {number} width - Output width
   * @param {string} format - Output format
   * @param {{manualCacheKey?: string | number}} [options] - Eleventy Image options
   * @returns {string} Generated filename
   */
  filenameFormat: (_id, src, width, format, options = {}) => {
    const basename = src
      .replace(/\\/g, "/")
      .replace(/^\.?\/?(src\/)?/, "")
      .replace(/^images\//, "")
      .replace(/^.*[/]?\.?image-cache\//, "")
      .replace(/\.[^.]+$/, "")
      .replace(/\//g, "-");
    const extension = src.slice(src.lastIndexOf(".") + 1).toLowerCase();
    const cropSuffix = options.manualCacheKey
      ? `-${extension}-crop-${String(options.manualCacheKey).replaceAll("/", "x")}`
      : "";
    return `${basename}${cropSuffix}-${width}.${format}`;
  },
});

/**
 * Prepare attributes for image and picture elements.
 * @param {Object} options - Attribute options
 * @param {string | null} [options.alt] - Alt text
 * @param {string | null} [options.sizes] - Sizes attribute
 * @param {string | null} [options.loading] - Loading attribute
 * @param {string | null} [options.classes] - CSS classes
 * @returns {{ imgAttributes: Record<string, string | null>, pictureAttributes: Record<string, string> }}
 */
export const prepareImageAttributes = ({
  alt = "",
  sizes,
  loading,
  classes,
}) => ({
  imgAttributes: {
    alt,
    sizes: sizes || DEFAULT_SIZE,
    loading: loading || "lazy",
    decoding: "async",
  },
  pictureAttributes: classes?.trim() ? { class: classes } : {},
});
