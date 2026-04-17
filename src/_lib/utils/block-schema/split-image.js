/* jscpd:ignore-start */
import {
  SPLIT_BASE_DOCS,
  SPLIT_BASE_FIELDS,
  str,
} from "#utils/block-schema/split-shared.js";
/* jscpd:ignore-end */

export const type = "split-image";

export const fields = {
  ...SPLIT_BASE_FIELDS,
  figure_src: {
    type: "image",
    label: "Figure Image",
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
