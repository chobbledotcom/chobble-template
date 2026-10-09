/* jscpd:ignore-start -- block schema declaration data */
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
};

export const example = {
  type: "markdown",
  content:
    "## Plain markdown\n\nThe simplest block: write markdown, get rich text. Lists, links, and **emphasis** all work.\n\n- One\n- Two\n- Three",
};
/* jscpd:ignore-end */
