import { ICON_LINKS_ITEMS_FIELD } from "#utils/block-schema/icon-links.js";
import {
  SPLIT_BASE_CMS_FIELDS,
  SPLIT_BASE_DOCS,
  SPLIT_BASE_PARAMS,
  SPLIT_BASE_SCHEMA,
} from "#utils/block-schema/split-shared.js";

export const type = "split-icon-links";

export const schema = [...SPLIT_BASE_SCHEMA, "figure_items"];

export const docs = {
  summary: "Two-column layout with text content and an icon-links list.",
  ...SPLIT_BASE_DOCS,
  params: {
    ...SPLIT_BASE_PARAMS,
    figure_items: {
      type: "array",
      required: true,
      description:
        'Icon-link objects. Each: `{icon, text, url}`. `url` is optional. Icon can be an Iconify ID (`"prefix:name"`), image path, or raw HTML/emoji.',
    },
  },
};

export const cmsFields = {
  ...SPLIT_BASE_CMS_FIELDS,
  figure_items: ICON_LINKS_ITEMS_FIELD,
};
