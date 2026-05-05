import {
  collectionField,
  IMAGE_ASPECT_RATIO_FIELD,
  ITEMS_COMMON_FIELDS,
  str,
} from "#utils/block-schema/shared.js";

export const type = "items";

export const fields = {
  collection: collectionField(
    'Name of an Eleventy collection (e.g. `"featuredProducts"`, `"events"`, `"news"`).',
  ),
  ...ITEMS_COMMON_FIELDS,
  image_aspect_ratio: IMAGE_ASPECT_RATIO_FIELD,
  filter_ui_collection: {
    ...str("Filter UI Collection"),
    description:
      "Optional name of a collection providing the client-side filter UI. When the collection is keyed by `page.fileSlug` (e.g. `categoryListingFilterUI`), the matching entry is used. Otherwise the collection itself is treated as a flat filter UI (e.g. `filteredProductPagesListingFilterUI`). When set, wraps the items in the products-layout sidebar.",
  },
};

export const docs = {
  summary:
    "Displays an Eleventy collection as a card grid or horizontal slider.",
  scss: "src/css/design-system/_items.scss",
};
