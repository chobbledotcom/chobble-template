import { CLASS_PARAM } from "#utils/block-schema/shared.js";

export const type = "section-header";

export const schema = ["intro", "align", "class"];

export const docs = {
  summary: "Standalone section header with rich text intro.",
  template: "src/_includes/design-system/section-header.html",
  scss: "src/css/design-system/_base.scss",
  htmlRoot: '<div class="section-header prose">',
  params: {
    intro: {
      type: "string",
      required: true,
      description:
        "Rich text content rendered as markdown. Use headings and body text together.",
    },
    align: {
      type: "string",
      default: '"center"',
      description: 'Text alignment. `"center"` adds `.text-center`.',
    },
    class: CLASS_PARAM,
  },
};
