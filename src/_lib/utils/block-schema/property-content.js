export const type = "property-content";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["properties"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the property page's main content (reviews-count link, optional about-heading, categories list, and the page body).",
  template: "src/_includes/design-system/property-content-block.html",
  notes:
    "Property-only block. No parameters. Reads `categories`, `tags`, and `{{ content }}` from the page; reads `strings.item_about_heading` and `config.show_product_review_counts` from site data.",
};
