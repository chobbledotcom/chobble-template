/* jscpd:ignore-start -- block schema declaration data */
import { img, str } from "#utils/block-schema/shared.js";
import {
  SPLIT_BASE_DOCS,
  SPLIT_BASE_FIELDS,
} from "#utils/block-schema/split-shared.js";

export const type = "split-image";

export const columnSafe = false;
export const template = "design-system/split.html";

export const fields = {
  ...SPLIT_BASE_FIELDS,
  figure_src: {
    ...img("Figure Image"),
    required: true,
    description: "Image path.",
  },
  figure_alt: {
    ...str("Figure Alt Text"),
    description: "Alt text for the image.",
  },
  figure_caption: {
    ...str("Figure Caption"),
    description: "Visible caption below the image.",
  },
};

export const docs = {
  summary: "Two-column layout with text content and a responsive image.",
  ...SPLIT_BASE_DOCS,
};

export const example = {
  type: "split-image",
  subtitle: "Split layouts",
  content:
    "## Text beside an image\n\nThe figure sits on the right by default; set `reverse: true` to flip the columns.",
  figure_src: "fireworks.jpg",
  figure_alt: "Fireworks over a city at night",
  figure_caption: "Captions are optional.",
};
/* jscpd:ignore-end */
