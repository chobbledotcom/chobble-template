import {
  INTRO_CONTENT_FIELD,
  objectList,
  str,
} from "#utils/block-schema/shared.js";

export const type = "icon-links";

export const containerWidth = "narrow";

/** Reusable CMS field for an icon-links item list (also used by split-icon-links). */
export const ICON_LINKS_ITEMS_FIELD = objectList("Links", {
  icon: str("Icon (Iconify ID or HTML entity)", { required: true }),
  text: str("Link Text", { required: true }),
  url: str("URL"),
});

export const fields = {
  intro_content: INTRO_CONTENT_FIELD,
  items: {
    ...ICON_LINKS_ITEMS_FIELD,
    required: true,
    description:
      'Link objects. Each: `{icon, text, url}`. `url` is optional — items without it render as plain text. Icon can be an Iconify ID (`"prefix:name"`), image path, or raw HTML/emoji.',
  },
  reveal: {
    type: "boolean",
    default: "true",
    description: "Adds `data-reveal` to each link item.",
  },
};

export const docs = {
  summary:
    "Vertical list of links with icons, rendered as a flex column stack.",
  template: "src/_includes/design-system/icon-links.html",
  scss: "src/css/design-system/_icon-links.scss",
  htmlRoot: '<ul class="icon-links" role="list">',
};
