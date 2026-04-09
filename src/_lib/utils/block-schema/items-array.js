import {
  buildItemsDocs,
  ITEMS_CMS_SHARED_FIELDS,
  ITEMS_COMMON_KEYS,
} from "#utils/block-schema/shared.js";

export const type = "items-array";

export const schema = ["collection", "items", ...ITEMS_COMMON_KEYS];

export const docs = buildItemsDocs({
  summary:
    "Renders items from an explicit list of paths (e.g. from Pages CMS content references).",
  template: "src/_includes/design-system/items-array-block.html",
  collectionDescription: "Collection to resolve paths against.",
  extraParams: {
    items: {
      type: "array",
      required: true,
      description: "Array of file paths (e.g. from Pages CMS references).",
    },
  },
});

export const cmsFields = {
  collection: ITEMS_CMS_SHARED_FIELDS.collection,
  items: {
    type: "reference",
    label: "Items",
    collection: "pages",
    search: "title",
    multiple: true,
  },
  intro: ITEMS_CMS_SHARED_FIELDS.intro,
  horizontal: ITEMS_CMS_SHARED_FIELDS.horizontal,
  masonry: ITEMS_CMS_SHARED_FIELDS.masonry,
  header_intro: ITEMS_CMS_SHARED_FIELDS.header_intro,
  filter: ITEMS_CMS_SHARED_FIELDS.filter,
};
