/* jscpd:ignore-start -- block schema declaration data */
import { ICON_LINKS_ITEMS_FIELD } from "#utils/block-schema/icon-links.js";
import {
  SPLIT_BASE_DOCS,
  SPLIT_BASE_FIELDS,
} from "#utils/block-schema/split-shared.js";

export const type = "split-icon-links";

export const columnSafe = false;
export const template = "design-system/split.html";

export const fields = {
  ...SPLIT_BASE_FIELDS,
  figure_items: {
    ...ICON_LINKS_ITEMS_FIELD,
    required: true,
    description:
      'Icon-link objects. Each: `{icon, text, url}`. `url` is optional. Icon can be an Iconify ID (`"prefix:name"`), image path, or raw HTML/emoji.',
  },
};

export const docs = {
  summary: "Two-column layout with text content and an icon-links list.",
  ...SPLIT_BASE_DOCS,
};

export const example = {
  type: "split-icon-links",
  subtitle: "Split layouts",
  content: "## Text beside a list of links\n\nEach link gets an icon.",
  figure_items: [
    { icon: "hugeicons:book-02", text: "How it works", url: "/how-it-works/" },
    { icon: "hugeicons:cube", text: "Blocks", url: "/blocks/" },
    { icon: "hugeicons:search-01", text: "Search", url: "/search/" },
  ],
};
/* jscpd:ignore-end */
