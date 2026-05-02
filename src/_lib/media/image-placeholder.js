// Placeholder image generation for fast dev builds
// Used when PLACEHOLDER_IMAGES=1 env var is set

import { wrapImageHtml } from "#media/image-wrapper.js";
import { createHtml } from "#utils/dom-builder.js";

// 1x1 transparent PNG as base64 data URL
const PLACEHOLDER_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/**
 * Generate placeholder HTML without any image processing.
 * Returns a simple wrapper with a 1px transparent PNG.
 * @param {{ alt?: string | null, classes?: string | null, sizes?: string | null, loading?: string | null, aspectRatio?: string | null, skipAspectRatio?: boolean }} options
 */
const generatePlaceholderHtml = async ({
  alt = "",
  classes,
  sizes = "auto",
  loading = "lazy",
  aspectRatio,
  skipAspectRatio = false,
}) => {
  const imgHtml = await createHtml("img", {
    src: PLACEHOLDER_PNG,
    alt,
    sizes,
    loading,
    decoding: "async",
  });
  const pictureHtml = await createHtml("picture", {}, imgHtml);
  const ratio = skipAspectRatio ? null : aspectRatio || "1/1";
  const style = ratio
    ? `aspect-ratio: ${ratio}; background: #eee`
    : "background: #eee";
  return wrapImageHtml(pictureHtml, {
    classes,
    style,
  });
};

export { generatePlaceholderHtml };
