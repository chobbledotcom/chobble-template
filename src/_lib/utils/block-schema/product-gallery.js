export const type = "product-gallery";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["products"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the product page's gallery (current image + thumbnails + slider).",
  template: "src/_includes/design-system/item-gallery-block.html",
  notes:
    "Product-only block. No parameters. Renders nothing when the product's `gallery` is empty.",
};
