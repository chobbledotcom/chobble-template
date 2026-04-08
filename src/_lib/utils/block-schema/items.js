import {
  buildItemsDocs,
  ITEMS_COMMON_KEYS,
} from "#utils/block-schema/shared.js";

export const type = "items";

export const schema = ["collection", ...ITEMS_COMMON_KEYS];

export const docs = buildItemsDocs({
  summary:
    "Displays an Eleventy collection as a card grid or horizontal slider.",
  template: "src/_includes/design-system/items-block.html",
  collectionDescription:
    'Name of an Eleventy collection (e.g. `"featuredProducts"`, `"events"`, `"news"`).',
});
