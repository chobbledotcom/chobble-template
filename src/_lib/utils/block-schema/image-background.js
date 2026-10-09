/* jscpd:ignore-start -- block schema declaration data */
import {
  bool,
  HERO_CONTENT_FIELDS,
  img,
  str,
} from "#utils/block-schema/shared.js";

export const type = "image-background";

export const columnSafe = false;

export const containerWidth = "full";

export const fields = {
  image: {
    ...img("Background Image"),
    required: true,
    description: "Image path.",
  },
  image_alt: {
    ...str("Image Alt Text"),
    default: "Background image",
    description: "Alt text.",
  },
  class: { ...str("CSS Class"), description: "Extra CSS classes." },
  ...HERO_CONTENT_FIELDS,
  content: {
    ...HERO_CONTENT_FIELDS.content,
    description:
      "Markdown overlay content rendered in `.prose` inside the `<figcaption>`.",
  },
  parallax: {
    ...bool("Parallax"),
    default: false,
    description: "Enables CSS `animation-timeline: scroll()` parallax effect.",
  },
  tint: {
    ...bool("Tint"),
    default: false,
    description:
      "Applies a dark gradient overlay for text legibility over the background image.",
  },
};

export const docs = {
  summary:
    "Full-width image background with hero-style overlay content (badge, markdown content, buttons) and optional parallax.",
  scss: "src/css/design-system/_image-background.scss",
  htmlRoot: '<div class="image-background">',
  notes:
    "Image processed via `{% image %}` at widths 2560/1920/1280/960/640, cropped to 16/9. Parallax uses `animation-timeline: scroll()` for native CSS scroll-driven translation.",
};

export const example = {
  type: "image-background",
  image: "city-traffic-night.jpg",
  image_alt: "City traffic at night",
  tint: true,
  badge: "Image background",
  content:
    "# Content over a full-width image\n\nA tint keeps the text readable.",
};
/* jscpd:ignore-end */
