import {
  HEADER_FIELDS,
  md,
  num,
  objectList,
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
  reveal: {
    type: "boolean",
    default: "true",
    description: "Adds `data-reveal` to each card.",
  },
  heading_level: {
    ...num("Heading Level"),
    default: "3",
    description: "Heading level for item titles.",
  },
  grid_class: {
    ...str("Grid Class"),
    default: '"features"',
    description:
      'CSS class on the `<ul>`. Options: `"features"` (auto-fit grid), `"grid"` (1/2/3 col), `"grid--4"` (1/2/4 col). Can combine: `"grid--4 text-center"`.',
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
