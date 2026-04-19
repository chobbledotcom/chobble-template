import {
  bool,
  HEADER_FIELDS,
  HEADING_LEVEL_FIELD,
  md,
  objectList,
  REVEAL_BOOLEAN_FIELD,
  str,
  TITLE_REQUIRED,
} from "#utils/block-schema/shared.js";

export const type = "features";

export const fields = {
  items: {
    ...objectList("Features", {
      icon: str("Icon (Iconify ID or HTML entity)"),
      title: TITLE_REQUIRED,
      description: md("Description", { required: true }),
      style: str("Custom Style"),
    }),
    required: true,
    description:
      'Feature objects. Each: `{icon, icon_label, title, description, style}`. Icon can be an Iconify ID (`"prefix:name"`), image path (`"/images/foo.svg"`), or raw HTML/emoji.',
  },
  intro: {
    ...md("Intro Content (Markdown)"),
    description: "Markdown content rendered above the grid in `.prose`.",
  },
  reveal: REVEAL_BOOLEAN_FIELD,
  heading_level: HEADING_LEVEL_FIELD,
  center: {
    ...bool("Centered"),
    default: "false",
    description: "If true, centers feature text.",
  },
  ...HEADER_FIELDS,
};

export const docs = {
  summary:
    "Grid of feature cards with optional icons, titles, and descriptions.",
  template: "src/_includes/design-system/features.html",
  scss: "src/css/design-system/_feature.scss",
  htmlRoot:
    '<ul class="features" role="list"> containing <li><article class="feature"> items',
};
