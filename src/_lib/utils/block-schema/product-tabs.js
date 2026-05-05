export const type = "product-tabs";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["products"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary: "Renders the product's `tabs` array as a tabbed content section.",
  template: "src/_includes/design-system/product-tabs-block.html",
  notes:
    "Product-only block. No parameters. Renders nothing when the page has no `tabs`.",
};
