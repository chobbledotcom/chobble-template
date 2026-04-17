import {
  collectionField,
  ITEMS_COMMON_FIELDS,
} from "#utils/block-schema/shared.js";

export const type = "items";

export const fields = {
  collection: collectionField(
    'Name of an Eleventy collection (e.g. `"featuredProducts"`, `"events"`, `"news"`).',
  ),
  ...ITEMS_COMMON_FIELDS,
};

export const docs = {
  summary:
    "Displays an Eleventy collection as a card grid or horizontal slider.",
  template: "src/_includes/design-system/items-block.html",
  scss: "src/css/design-system/_items.scss",
};
