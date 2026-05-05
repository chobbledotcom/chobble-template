import {
  IMAGE_ASPECT_RATIO_FIELD,
  ITEMS_PRESENTATION_FIELDS,
} from "#utils/block-schema/shared.js";

export const type = "category-products";

export const collections = ["categories"];

export const fields = {
  ...ITEMS_PRESENTATION_FIELDS,
  image_aspect_ratio: IMAGE_ASPECT_RATIO_FIELD,
};

export const docs = {
  summary:
    "Lists every product tagged with the current category, with the client-side filter sidebar.",
  template: "src/_includes/design-system/category-products-block.html",
  notes:
    "Categories-only block. Equivalent to an `items` block with `collection: products`, a `data.categories equals page.fileSlug` filter, and `filter_ui_collection: categoryListingFilterUI` — exposed as a single block so editors don't have to wire those settings up themselves. Accepts the same presentation fields as `items` (`intro_content`, `horizontal`, `masonry`, `image_aspect_ratio`).",
};
