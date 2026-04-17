import { str } from "#utils/block-schema/shared.js";

export const type = "code-block";

export const fields = {
  filename: {
    ...str("Filename"),
    required: true,
    description: "Displayed in the toolbar header.",
  },
  code: {
    ...str("Code"),
    required: true,
    description: "Code content. Rendered in `<pre><code>`.",
  },
  language: {
    ...str("Language"),
    description:
      "Sets `data-language` attribute (for future syntax highlighting).",
  },
  reveal: {
    type: "boolean",
    default: "true",
    description: "`data-reveal` value.",
  },
};

export const docs = {
  summary: "Terminal-style code display with macOS-like toolbar header.",
  template: "src/_includes/design-system/code-block.html",
  scss: "src/css/design-system/_code-block.scss",
  htmlRoot: '<div class="code-block">',
};
