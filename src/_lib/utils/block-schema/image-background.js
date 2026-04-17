import {
  bool,
  img,
  OVERLAY_CONTENT_FIELDS,
  str,
} from "#utils/block-schema/shared.js";

export const type = "image-background";

export const containerWidth = "full";

export const fields = {
  image: {
    ...img("Background Image"),
    required: true,
    description: "Image path.",
  },
  image_alt: {
    ...str("Image Alt Text"),
    default: '"Background image"',
    description: "Alt text.",
  },
  ...OVERLAY_CONTENT_FIELDS,
  parallax: {
    ...bool("Parallax"),
    default: "false",
    description: "Enables CSS `animation-timeline: scroll()` parallax effect.",
  },
};

export const docs = {
  summary:
    "Full-width image background with overlaid text and optional parallax.",
  template: "src/_includes/design-system/image-background.html",
  scss: "src/css/design-system/_image-background.scss",
  htmlRoot: '<div class="image-background">',
  notes:
    "Image processed via `{% image %}` at widths 2560/1920/1280/960/640, cropped to 16/9. Parallax uses `animation-timeline: scroll()` for native CSS scroll-driven translation.",
};
