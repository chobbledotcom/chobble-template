import {
  CLASS_PARAM,
  OVERLAY_CONTENT_PARAM,
} from "#utils/block-schema/shared.js";

export const type = "image-background";

export const schema = ["image", "image_alt", "content", "class", "parallax"];

export const docs = {
  summary:
    "Full-width image background with overlaid text and optional parallax.",
  template: "src/_includes/design-system/image-background.html",
  scss: "src/css/design-system/_image-background.scss",
  htmlRoot: '<div class="image-background">',
  notes:
    "Image processed via `{% image %}` at widths 2560/1920/1280/960/640, cropped to 16/9. Parallax uses `animation-timeline: scroll()` for native CSS scroll-driven translation.",
  params: {
    image: {
      type: "string",
      required: true,
      description: "Image path.",
    },
    image_alt: {
      type: "string",
      default: '"Background image"',
      description: "Alt text.",
    },
    content: OVERLAY_CONTENT_PARAM,
    class: CLASS_PARAM,
    parallax: {
      type: "boolean",
      default: "false",
      description:
        "Enables CSS `animation-timeline: scroll()` parallax effect.",
    },
  },
};
