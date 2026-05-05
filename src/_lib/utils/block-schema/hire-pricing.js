export const type = "hire-pricing";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["products"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders a hire-mode pricing table listing the product's daily rates.",
  template: "src/_includes/design-system/hire-pricing-block.html",
  notes:
    "Product-only block. No parameters. Renders nothing unless the product's `product_mode` (or `config.product_mode`) is `hire` and the product has at least one option.",
};
