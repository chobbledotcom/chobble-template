import {
  HEADER_KEYS,
  HEADER_PARAM_DOCS,
  REVEAL_BOOLEAN_PARAM,
} from "#utils/block-schema/shared.js";

export const type = "features";

export const schema = [
  "items",
  "reveal",
  "heading_level",
  "grid_class",
  ...HEADER_KEYS,
];

export const docs = {
  summary:
    "Grid of feature cards with optional icons, titles, and descriptions.",
  template: "src/_includes/design-system/features.html",
  scss: "src/css/design-system/_feature.scss",
  htmlRoot:
    '<ul class="features" role="list"> containing <li><article class="feature"> items',
  params: {
    items: {
      type: "array",
      required: true,
      description:
        'Feature objects. Each: `{icon, icon_label, title, description, style}`. Icon can be an Iconify ID (`"prefix:name"`), image path (`"/images/foo.svg"`), or raw HTML/emoji.',
    },
    heading_level: {
      type: "number",
      default: "3",
      description: "Heading level for item titles.",
    },
    grid_class: {
      type: "string",
      default: '"features"',
      description:
        'CSS class on the `<ul>`. Options: `"features"` (auto-fit grid), `"grid"` (1/2/3 col), `"grid--4"` (1/2/4 col). Can combine: `"grid--4 text-center"`.',
    },
    reveal: REVEAL_BOOLEAN_PARAM,
    ...HEADER_PARAM_DOCS,
  },
};
