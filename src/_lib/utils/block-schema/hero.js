import {
  BUTTON_FIELDS_WITH_SIZE,
  NAME_REQUIRED,
  objectList,
  REVEAL_STRING_FIELD,
  str,
} from "#utils/block-schema/shared.js";

export const type = "hero";

export const containerWidth = "full";

export const fields = {
  badge: {
    ...str("Badge Text"),
    description:
      'Small pill label above the name. Renders as `<span class="badge">`.',
  },
  name: {
    ...NAME_REQUIRED,
    description: "Main `<h1>` heading.",
  },
  lead: {
    ...str("Lead Text"),
    description:
      "Subtitle paragraph. `body-lg` size, muted color, max-width `$width-narrow` (680px).",
  },
  buttons: {
    ...objectList("Buttons", BUTTON_FIELDS_WITH_SIZE),
    description:
      'Action buttons. Each: `{text, href, variant, size}`. Variants: `"primary"` (filled), `"secondary"` (outlined), `"ghost"` (transparent). Sizes: `"sm"`, `"lg"`, or omit for default.',
  },
  class: {
    ...str("CSS Class"),
    description:
      'Extra CSS classes on the `<header>`. Use `"gradient"` for gradient bg.',
  },
  reveal: REVEAL_STRING_FIELD,
};

export const docs = {
  summary:
    "Full-width hero banner with optional badge, name, lead text, and action buttons.",
  scss: "src/css/design-system/_hero.scss",
  htmlRoot: '<header class="hero">',
};
