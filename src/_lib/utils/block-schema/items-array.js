import {
  ITEMS_CMS_SHARED_FIELDS,
  ITEMS_COMMON_KEYS,
  ITEMS_COMMON_PARAMS,
  ITEMS_GRID_META,
  str,
} from "#utils/block-schema/shared.js";

export const type = "items-array";

export const schema = ["items", ...ITEMS_COMMON_KEYS];

export const docs = {
  summary:
    "Renders items from an explicit list of paths. The collection is inferred dynamically from each item's path.",
  template: "src/_includes/design-system/items-array-block.html",
  scss: ITEMS_GRID_META.scss,
  params: {
    items: {
      type: "array",
      required: true,
      description: "Array of file paths as strings.",
    },
    ...ITEMS_COMMON_PARAMS,
  },
};

export const cmsFields = {
  items: str("Items", { list: true, required: true }),
  intro: ITEMS_CMS_SHARED_FIELDS.intro,
  horizontal: ITEMS_CMS_SHARED_FIELDS.horizontal,
  masonry: ITEMS_CMS_SHARED_FIELDS.masonry,
  header_intro: ITEMS_CMS_SHARED_FIELDS.header_intro,
  filter: ITEMS_CMS_SHARED_FIELDS.filter,
};
