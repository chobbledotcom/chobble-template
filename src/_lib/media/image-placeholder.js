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
 */
const generatePlaceholderHtml = async ({
  alt = "",
  classes,
  sizes = "auto",
  loading = "lazy",
  aspectRatio,
}) => {
  const imgHtml = await createHtml("img", {
    src: PLACEHOLDER_PNG,
    alt,
    sizes,
    loading,
    decoding: "async",
  });
  const pictureHtml = await createHtml("picture", {}, imgHtml);
  return wrapImageHtml(pictureHtml, {
    classes,
    style: aspectRatio
      ? `aspect-ratio: ${aspectRatio}; background: #eee`
      : "aspect-ratio: 1/1; background: #eee",
  });
};

export { generatePlaceholderHtml };
