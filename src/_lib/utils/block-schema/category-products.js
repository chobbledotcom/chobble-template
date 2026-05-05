import { ITEMS_SUGAR_FIELDS } from "#utils/block-schema/shared.js";

export const type = "category-products";

/* jscpd:ignore-start */
export const collections = ["categories"];

export const fields = ITEMS_SUGAR_FIELDS;
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Lists every product tagged with the current category, with the client-side filter sidebar.",
  notes:
    "Categories-only block. Equivalent to an `items` block with `collection: products`, a `data.categories equals page.fileSlug` filter, and `filter_ui_collection: categoryListingFilterUI` — exposed as a single block so editors don't have to wire those settings up themselves. Accepts the same presentation fields as `items` (`intro_content`, `horizontal`, `masonry`, `image_aspect_ratio`).",
};
