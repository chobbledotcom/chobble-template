/* jscpd:ignore-start -- block schema declaration data */
import {
  INTRO_CONTENT_FIELD,
  objectList,
  revealToggleField,
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
  reveal: revealToggleField("each link item"),
};

export const docs = {
  summary:
    "Vertical list of links with icons, rendered as a flex column stack.",
  scss: "src/css/design-system/_icon-links.scss",
  htmlRoot: '<ul class="icon-links" role="list">',
};

export const example = {
  type: "icon-links",
  intro_content: "## Links with icons",
  items: [
    { icon: "hugeicons:book-02", text: "How it works", url: "/how-it-works/" },
    { icon: "hugeicons:cube", text: "Browse the blocks", url: "/blocks/" },
    { icon: "hugeicons:search-01", text: "Search the site", url: "/search/" },
  ],
};
/* jscpd:ignore-end */
