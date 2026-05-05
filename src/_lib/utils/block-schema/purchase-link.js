export const type = "purchase-link";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["products"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders a 'Purchase Now' button linking to the page's `purchase_url`.",
  template: "src/_includes/design-system/purchase-link-block.html",
  notes:
    "Product-only block. No parameters. Renders nothing when `purchase_url` is not set.",
};
