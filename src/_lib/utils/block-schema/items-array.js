import {
  buildItemsDocs,
  ITEMS_COMMON_KEYS,
} from "#utils/block-schema/shared.js";

export const type = "items_array";

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
