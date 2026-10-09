/* jscpd:ignore-start -- block schema declaration data */
import { str } from "#utils/block-schema/shared.js";
import {
  SPLIT_BASE_DOCS,
  SPLIT_BASE_FIELDS,
} from "#utils/block-schema/split-shared.js";

export const type = "split-code";

export const columnSafe = false;
export const template = "design-system/split.html";

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

export const example = {
  type: "split-code",
  subtitle: "Split layouts",
  content:
    "## Text beside a code block\n\nUse this to walk through configuration or commands next to the explanation.",
  figure_filename: "site.json",
  figure_language: "json",
  figure_code: '{\n  "name": "My Site",\n  "url": "https://example.com"\n}',
};
/* jscpd:ignore-end */
