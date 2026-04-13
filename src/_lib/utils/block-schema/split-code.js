import { str } from "#utils/block-schema/shared.js";
import {
  SPLIT_BASE_CMS_FIELDS,
  SPLIT_BASE_DOCS,
  SPLIT_BASE_PARAMS,
  SPLIT_BASE_SCHEMA,
} from "#utils/block-schema/split-shared.js";

export const type = "split-code";

export const schema = [
  ...SPLIT_BASE_SCHEMA,
  "figure_filename",
  "figure_code",
  "figure_language",
];

export const docs = {
  summary: "Two-column layout with text content and a code block.",
  ...SPLIT_BASE_DOCS,
  params: {
    ...SPLIT_BASE_PARAMS,
    figure_filename: {
      type: "string",
      description: "Displayed filename in the code block header.",
    },
    figure_code: {
      type: "string",
      required: true,
      description: "Code content.",
    },
    figure_language: {
      type: "string",
      description: "Syntax highlighting language.",
    },
  },
};

export const cmsFields = {
  ...SPLIT_BASE_CMS_FIELDS,
  figure_filename: str("Code Filename"),
  figure_code: str("Code Content"),
  figure_language: str("Code Language"),
};
