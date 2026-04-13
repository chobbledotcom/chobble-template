import {
  SPLIT_BASE_CMS_FIELDS,
  SPLIT_BASE_DOCS,
  SPLIT_BASE_PARAMS,
  SPLIT_BASE_SCHEMA,
  str,
} from "#utils/block-schema/split-shared.js";

export const type = "split-image";

export const schema = [
  ...SPLIT_BASE_SCHEMA,
  "figure_src",
  "figure_alt",
  "figure_caption",
];

export const docs = {
  summary: "Two-column layout with text content and a responsive image.",
  ...SPLIT_BASE_DOCS,
  params: {
    ...SPLIT_BASE_PARAMS,
    figure_src: {
      type: "string",
      required: true,
      description: "Image path.",
    },
    figure_alt: {
      type: "string",
      description: "Alt text for the image.",
    },
    figure_caption: {
      type: "string",
      description: "Visible caption below the image.",
    },
  },
};

export const cmsFields = {
  ...SPLIT_BASE_CMS_FIELDS,
  figure_src: { type: "image", label: "Figure Image" },
  figure_alt: str("Figure Alt Text"),
  figure_caption: str("Figure Caption"),
};
