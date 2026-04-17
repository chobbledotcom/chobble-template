import { md } from "#utils/block-schema/shared.js";

export const type = "markdown";

export const fields = {
  content: {
    ...md("Markdown"),
    required: true,
    description:
      'Markdown content. Passed through `renderContent: "md"` filter.',
  },
};

export const docs = {
  summary: "Renders markdown content as rich text.",
  htmlRoot: '<div class="prose">',
  scss: "src/css/design-system/_prose.scss",
  notes: "Inline in `render-block.html` (no separate template file).",
};
