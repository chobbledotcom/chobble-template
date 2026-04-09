import { REVEAL_BOOLEAN_PARAM, str } from "#utils/block-schema/shared.js";

export const type = "code-block";

export const schema = ["filename", "code", "language", "reveal"];

export const docs = {
  summary: "Terminal-style code display with macOS-like toolbar header.",
  template: "src/_includes/design-system/code-block.html",
  scss: "src/css/design-system/_code-block.scss",
  htmlRoot: '<div class="code-block">',
  params: {
    filename: {
      type: "string",
      required: true,
      description: "Displayed in the toolbar header.",
    },
    code: {
      type: "string",
      required: true,
      description: "Code content. Rendered in `<pre><code>`.",
    },
    language: {
      type: "string",
      description:
        "Sets `data-language` attribute (for future syntax highlighting).",
    },
    reveal: { ...REVEAL_BOOLEAN_PARAM, description: "`data-reveal` value." },
  },
};

export const cmsFields = {
  filename: str("Filename", { required: true }),
  code: str("Code", { required: true }),
  language: str("Language"),
};
