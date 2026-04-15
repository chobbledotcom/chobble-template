import {
  md,
  objectList,
  REVEAL_BOOLEAN_PARAM,
  str,
} from "#utils/block-schema/shared.js";

export const type = "icon-links";

export const containerWidth = "narrow";

export const schema = ["intro", "items", "reveal"];

export const docs = {
  summary:
    "Vertical list of links with icons, rendered as a flex column stack.",
  template: "src/_includes/design-system/icon-links.html",
  scss: "src/css/design-system/_icon-links.scss",
  htmlRoot: '<ul class="icon-links" role="list">',
  params: {
    intro: {
      type: "string",
      description:
        "Markdown content rendered above the links list in `.prose`.",
    },
    items: {
      type: "array",
      required: true,
      description:
        'Link objects. Each: `{icon, text, url}`. `url` is optional — items without it render as plain text. Icon can be an Iconify ID (`"prefix:name"`), image path, or raw HTML/emoji.',
    },
    reveal: {
      ...REVEAL_BOOLEAN_PARAM,
      description: "Adds `data-reveal` to each link item.",
    },
  },
};

/** Reusable CMS field for an icon-links item list. */
export const ICON_LINKS_ITEMS_FIELD = objectList("Links", {
  icon: str("Icon (Iconify ID or HTML entity)", { required: true }),
  text: str("Link Text", { required: true }),
  url: str("URL"),
});

export const cmsFields = {
  intro: md("Intro Content (Markdown)"),
  items: ICON_LINKS_ITEMS_FIELD,
};
