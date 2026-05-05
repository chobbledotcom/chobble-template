export const type = "product-features";

/* jscpd:ignore-start */
export const containerWidth = "narrow";

export const collections = ["products"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Lists the product's `features` array as plain text items, delegating to the `icon-links` block.",
  template: "src/_includes/design-system/product-features-block.html",
  notes:
    "Product-only block. No parameters. Renders nothing when the page's `features` array is empty.",
};
