import { ITEMS_SUGAR_FIELDS } from "#utils/block-schema/shared.js";

export const type = "child-categories";

/* jscpd:ignore-start */
export const collections = ["categories"];

export const fields = ITEMS_SUGAR_FIELDS;
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Lists every direct child category of the current category. Renders nothing when the category has no children.",
  template: "src/_includes/design-system/child-categories-block.html",
  notes:
    'Categories-only block. Equivalent to an `items` block with `collection: categories` and `filter: { property: "data.parent", equals: "<page.fileSlug>" }` — exposed as a single block so editors don\'t have to wire those settings up themselves. Accepts the same presentation fields as `items` (`intro_content`, `horizontal`, `masonry`, `image_aspect_ratio`).',
};
