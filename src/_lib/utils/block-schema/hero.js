import { HERO_CONTENT_FIELDS, str } from "#utils/block-schema/shared.js";

export const type = "hero";

export const containerWidth = "full";

export const fields = {
  ...HERO_CONTENT_FIELDS,
  content: {
    ...HERO_CONTENT_FIELDS.content,
    required: true,
    description:
      "Markdown content rendered in `.prose`. Start with a `# Heading`; paragraphs get `body-lg` size, muted color, max-width `$width-narrow` (680px).",
  },
  class: {
    ...str("CSS Class"),
    description:
      'Extra CSS classes on the `<header>`. Use `"gradient"` for gradient bg.',
  },
};

export const docs = {
  summary:
    "Full-width hero banner with optional badge, markdown content, and action buttons.",
  scss: "src/css/design-system/_hero.scss",
  htmlRoot: '<header class="hero">',
};
