export const type = "product-contact-section";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["products"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the inline contact section on a product page (delegates to `item-contact-section.html`).",
  template: "src/_includes/design-system/item-contact-section-block.html",
  notes:
    "Product-only block. No parameters. Honours the page's `formspark_id` override and falls back to `config.form_target`.",
};
