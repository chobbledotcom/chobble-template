/* jscpd:ignore-start -- block schema declaration data */
import { HERO_CONTENT_FIELDS, str } from "#utils/block-schema/shared.js";

export const type = "hero";

export const columnSafe = false;

export const containerWidth = "full";

export const fields = {
  ...HERO_CONTENT_FIELDS,
  content: {
    ...HERO_CONTENT_FIELDS.content,
    required: true,
    description:
      "Markdown content rendered in `.prose`. Start with a `# Heading`; paragraphs get `body-lg` size and muted color in a centered, guttered measure.",
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

export const example = {
  type: "hero",
  badge: "Hero block",
  content:
    "# A full-width opening banner\n\nStart most pages with one of these: a heading, a sentence of context, and the actions that matter.",
  buttons: [
    {
      text: "Primary action",
      href: "/how-it-works/",
      variant: "primary",
      size: "lg",
    },
    { text: "Secondary", href: "/blocks/", variant: "secondary", size: "lg" },
  ],
};
/* jscpd:ignore-end */
