export const type = "product-add-ons";

/* jscpd:ignore-start */
export const collections = ["products"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the product's `add_ons` as an add-on card with optional intro markdown plus a priced list of extras.",
  template: "src/_includes/design-system/product-add-ons-block.html",
  notes:
    "Product-only block. No parameters. Renders nothing when neither `add_ons.intro` nor `add_ons.options` is set.",
};
