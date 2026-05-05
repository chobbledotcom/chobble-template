export const type = "product-meta";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["products"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the product page's metadata: optional reviews-count link followed by the categories list.",
  template: "src/_includes/design-system/product-meta-block.html",
  notes:
    "Product-only block. No parameters. Reads `categories` and `tags` from the page; reads `config.show_product_review_counts` from site data.",
};
