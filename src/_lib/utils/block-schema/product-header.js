export const type = "product-header";
export const template = "design-system/blocks/item-header.html";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["products"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary: "Renders a product page's heading: title and optional subtitle.",
  notes:
    "Product-only block. No parameters. Reads `title` and `subtitle` from the product page data.",
};
