import {
  BUTTON_FIELDS_WITH_SIZE,
  objectList,
  REVEAL_PARAM,
  str,
  TITLE_REQUIRED,
} from "#utils/block-schema/shared.js";

export const type = "hero";

export const schema = ["badge", "title", "lead", "buttons", "class", "reveal"];

export const docs = {
  summary:
    "Full-width hero banner with optional badge, title, lead text, and action buttons.",
  template: "src/_includes/design-system/hero.html",
  scss: "src/css/design-system/_hero.scss",
  htmlRoot: '<header class="hero">',
  params: {
    title: {
      type: "string",
      required: true,
      description: "Main `<h1>` heading.",
    },
    badge: {
      type: "string",
      description:
        'Small pill label above the title. Renders as `<span class="badge">`.',
    },
    lead: {
      type: "string",
      description:
        "Subtitle paragraph. `body-lg` size, muted color, max-width `$width-narrow` (680px).",
    },
    buttons: {
      type: "array",
      description:
        'Action buttons. Each: `{text, href, variant, size}`. Variants: `"primary"` (filled), `"secondary"` (outlined), `"ghost"` (transparent). Sizes: `"sm"`, `"lg"`, or omit for default.',
    },
    class: {
      type: "string",
      description:
        'Extra CSS classes on the `<header>`. Use `"gradient"` for gradient bg.',
    },
    reveal: REVEAL_PARAM,
  },
};

export const cmsFields = {
  class: str("CSS Class"),
  badge: str("Badge Text"),
  title: TITLE_REQUIRED,
  lead: str("Lead Text"),
  buttons: objectList("Buttons", BUTTON_FIELDS_WITH_SIZE),
};
