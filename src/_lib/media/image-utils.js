/**
 * Image utility functions
 *
 * Helpers for image path normalization, URL detection, and attribute building.
 * Extracted to reduce complexity in image.js and provide reusable utilities.
 */
import { compact } from "#utils/array-utils.js";

const DEFAULT_WIDTHS = [240, 480, 900, 1300, "auto"];
const DEFAULT_SIZE = "auto";

/**
 * Normalize image path to resolve from project root.
 * Handles various input formats:
 * - "/images/photo.jpg" -> "./src/images/photo.jpg"
 * - "src/images/photo.jpg" -> "./src/images/photo.jpg"
 * - "images/photo.jpg" -> "./src/images/photo.jpg"
 * - "photo.jpg" -> "./src/images/photo.jpg"
 */
export const normalizeImagePath = (imageName) => {
  const name = imageName.toString();
  if (name.startsWith("/")) return `./src${name}`;
  if (name.startsWith("src/")) return `./${name}`;
  if (name.startsWith("images/")) return `./src/${name}`;
  return `./src/images/${name}`;
};

/**
 * Check if URL is external (http:// or https://).
 */
export const isExternalUrl = (url) =>
  url.startsWith("http://") || url.startsWith("https://");

/**
 * Parse widths parameter.
 * Handles comma-separated string "240,480,900" or array [240, 480, 900].
 */
export const parseWidths = (widths) =>
  typeof widths === "string" ? widths.split(",") : widths || DEFAULT_WIDTHS;

/**
 * Build standard image attributes object.
 */
export const buildImgAttributes = (alt, sizes, loading) => ({
  alt: alt || "",
  sizes: sizes || DEFAULT_SIZE,
  loading: loading || "lazy",
  decoding: "async",
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
