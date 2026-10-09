/* jscpd:ignore-start -- block schema declaration data */
import { md } from "#utils/block-schema/shared.js";
import {
  SPLIT_BASE_DOCS,
  SPLIT_BASE_FIELDS,
} from "#utils/block-schema/split-shared.js";

export const type = "split-html";

export const columnSafe = false;
export const template = "design-system/split.html";

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

export const example = {
  type: "split-html",
  subtitle: "Split layouts",
  content:
    "## Text beside custom HTML\n\nThe figure column renders whatever HTML you give it.",
  figure_html: '<p style="font-size:3rem;text-align:center">&#127881;</p>',
};
/* jscpd:ignore-end */
