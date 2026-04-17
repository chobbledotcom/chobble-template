/* jscpd:ignore-start */
import {
  SPLIT_BASE_DOCS,
  SPLIT_BASE_FIELDS,
  str,
} from "#utils/block-schema/split-shared.js";
/* jscpd:ignore-end */

export const type = "split-code";

export const fields = {
  ...SPLIT_BASE_FIELDS,
  figure_filename: {
    ...str("Code Filename"),
    description: "Displayed filename in the code block header.",
  },
  figure_code: {
    ...str("Code Content"),
    required: true,
    description: "Code content.",
  },
  figure_language: {
    ...str("Code Language"),
    description: "Syntax highlighting language.",
  },
};

export const docs = {
  summary: "Two-column layout with text content and a code block.",
  ...SPLIT_BASE_DOCS,
};
