/* jscpd:ignore-start -- block schema declaration data */
import { md } from "#utils/block-schema/shared.js";

export const type = "section-header";

export const fields = {
  intro: {
    ...md("Section Header Intro"),
    required: true,
    description:
      "Rich text content rendered as markdown. Use headings and body text together.",
  },
  align: {
    type: "string",
    default: "center",
    description: 'Text alignment. `"center"` adds `.text-center`.',
  },
  class: { type: "string", description: "Extra CSS classes." },
};

export const docs = {
  summary: "Standalone section header with rich text intro.",
  scss: "src/css/design-system/_base.scss",
  htmlRoot: '<div class="section-header prose">',
};

export const example = {
  type: "section-header",
  intro:
    "## Section headers introduce a page section\n\nUse one wherever a group of blocks needs a heading and a sentence of context.",
};
/* jscpd:ignore-end */
