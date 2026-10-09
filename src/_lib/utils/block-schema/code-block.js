/* jscpd:ignore-start -- block schema declaration data */
import {
  INTRO_CONTENT_FIELD,
  revealToggleField,
  str,
} from "#utils/block-schema/shared.js";

export const type = "code-block";

export const fields = {
  intro_content: INTRO_CONTENT_FIELD,
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
  reveal: revealToggleField("the code block"),
};

export const docs = {
  summary: "Terminal-style code display with macOS-like toolbar header.",
  scss: "src/css/design-system/_code-block.scss",
  htmlRoot: '<div class="code-block">',
};

export const example = {
  type: "code-block",
  intro_content: "## Commands to get started",
  filename: "quick-start.sh",
  language: "bash",
  code: "npm install\nnpm run serve",
};
/* jscpd:ignore-end */
