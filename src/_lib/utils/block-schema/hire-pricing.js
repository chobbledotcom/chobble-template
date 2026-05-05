export const type = "hire-pricing";

/* jscpd:ignore-start */
export const collections = ["products"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the product's hire-mode daily rates, delegating to the `stats` block (price as value, duration as label).",
  notes:
    "Product-only block. No parameters. Renders nothing unless the product's `product_mode` (or `config.product_mode`) is `hire` and the product has at least one option.",
};
