/**
 * Image utility functions
 *
 * Helpers for image path normalization, URL detection, and attribute building.
 * Extracted to reduce complexity in image.js and provide reusable utilities.
 */
import { compact } from "#toolkit/fp/array.js";

export { isExternalUrl } from "#utils/url-utils.js";

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
 * Parse widths parameter and add "auto" for original source image.
 * Handles comma-separated string "240,480,900" or array [240, 480, 900].
 * Always appends "auto" to include the original source image.
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
 * Build standard image attributes object.
 * @param {Object} options - Attribute options
 * @param {string | null} [options.src] - Image source (for external images)
 * @param {string | null} [options.alt] - Alt text
 * @param {string | null} [options.sizes] - Sizes attribute
 * @param {string | null} [options.loading] - Loading attribute
 * @param {string | null} [options.classes] - CSS classes
 * @returns {Record<string, string>} Image attributes
 */
const buildImgAttributes = ({
  src = null,
  alt = "",
  sizes = null,
  loading = null,
  classes = null,
} = {}) => ({
  ...(src && { src }),
  alt,
  sizes: sizes || DEFAULT_SIZE,
  loading: loading || "lazy",
  decoding: "async",
  ...(classes && { class: classes }),
});

/**
 * Build picture element attributes.
 * @param {string | null} classes - CSS classes
 * @returns {Record<string, string>} Picture attributes
 */
const buildPictureAttributes = (classes) =>
  classes?.trim() ? { class: classes } : {};

/**
 * Build wrapper styles for images from pre-computed values.
 * Shared by both local and external image processing paths.
 * @param {Object} options
 * @param {string | null} options.bgImage - LQIP background image CSS value
 * @param {string | null} options.aspectRatio - Pre-computed aspect ratio string
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

/**
 * Build wrapper styles for local images.
 * Computes aspect ratio from metadata, then delegates to buildImageWrapperStyles.
 * @param {string | null} bgImage - LQIP background image CSS value
 * @param {string | null} aspectRatio - Aspect ratio string
 * @param {object} metadata - Image metadata with width property
 * @param {Function} getAspectRatioFn - Function to compute aspect ratio
 * @param {boolean} [skipMaxWidth=false] - Skip max-width constraint
 */
export const buildWrapperStyles = (
  bgImage,
  aspectRatio,
  metadata,
  getAspectRatioFn,
  skipMaxWidth = false,
) =>
  buildImageWrapperStyles({
    bgImage,
    aspectRatio: getAspectRatioFn(aspectRatio, metadata),
    maxWidth: metadata.width,
    skipMaxWidth,
  });

/**
 * Converts a file path to a unique, filename-safe basename.
 * Strips common prefixes (./src/, src/) and the images/ directory,
 * then strips everything up to and including .image-cache/ if present anywhere.
 * Finally converts remaining path segments to hyphen-separated format.
 *
 * E.g., "./src/images/products/photo.jpg" -> "products-photo"
 *       "./src/images/photo.jpg" -> "photo"
 *       "./src/assets/icons/logo.png" -> "assets-icons-logo"
 *       ".image-cache/photo-crop-abc123.jpeg" -> "photo-crop-abc123"
 *       "/abs/path/.image-cache/photo.jpeg" -> "photo"
 */
export const getPathAwareBasename = (src) => {
  const normalized = src
    .replace(/\\/g, "/")
    .replace(/^\.?\/?(src\/)?/, "")
    .replace(/^images\//, "")
    .replace(/^.*[/]?\.?image-cache\//, "");
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

// JPEG fallback width - only generate one JPEG size since nearly all browsers support webp
export const JPEG_FALLBACK_WIDTH = 1300;

/**
 * Default options for eleventy-img processing.
 * Shared between local and external image processing.
 */
export const DEFAULT_IMAGE_OPTIONS = {
  outputDir: ".image-cache",
  urlPath: "/img/",
  filenameFormat,
};

/**
 * Prepare attributes for image and picture elements.
 * @param {Object} options - Attribute options
 * @param {string | null} options.alt - Alt text
 * @param {string | null} options.sizes - Sizes attribute
 * @param {string | null} options.loading - Loading attribute
 * @param {string | null} options.classes - CSS classes
 * @returns {{ imgAttributes: Record<string, string>, pictureAttributes: Record<string, string> }}
 */
export const prepareImageAttributes = ({ alt, sizes, loading, classes }) => ({
  imgAttributes: buildImgAttributes({ alt, sizes, loading }),
  pictureAttributes: buildPictureAttributes(classes),
});
