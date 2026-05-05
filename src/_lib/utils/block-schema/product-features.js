export const type = "product-features";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["products"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the product's `features` array as a bulleted feature card.",
  template: "src/_includes/design-system/product-features-block.html",
  notes:
    "Product-only block. No parameters. Renders nothing when the page's `features` array is empty.",
};
