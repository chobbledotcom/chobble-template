import {
  md,
  SPLIT_BASE_DOCS,
  SPLIT_BASE_FIELDS,
} from "#utils/block-schema/split-shared.js";

export const type = "split-html";

export const fields = {
  ...SPLIT_BASE_FIELDS,
  figure_html: {
    ...md("Figure HTML Content"),
    required: true,
    description: "Raw HTML content for the figure side.",
  },
};

export const docs = {
  summary: "Two-column layout with text content and custom HTML.",
  ...SPLIT_BASE_DOCS,
};
