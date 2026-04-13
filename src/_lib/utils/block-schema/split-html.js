import { md } from "#utils/block-schema/shared.js";
import {
  SPLIT_BASE_CMS_FIELDS,
  SPLIT_BASE_DOCS,
  SPLIT_BASE_PARAMS,
  SPLIT_BASE_SCHEMA,
} from "#utils/block-schema/split-shared.js";

export const type = "split-html";

export const schema = [...SPLIT_BASE_SCHEMA, "figure_html"];

export const docs = {
  summary: "Two-column layout with text content and custom HTML.",
  ...SPLIT_BASE_DOCS,
  params: {
    ...SPLIT_BASE_PARAMS,
    figure_html: {
      type: "string",
      required: true,
      description: "Raw HTML content for the figure side.",
    },
  },
};

export const cmsFields = {
  ...SPLIT_BASE_CMS_FIELDS,
  figure_html: md("Figure HTML Content"),
};
