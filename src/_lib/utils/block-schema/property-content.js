export const type = "property-content";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["properties"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the property page's metadata (reviews-count link, optional about-heading, categories list).",
  template: "src/_includes/design-system/property-content-block.html",
  notes:
    "Property-only block. No parameters. Reads `categories` and `tags` from the page; reads `strings.item_about_heading` and `config.show_product_review_counts` from site data. Body content is expressed as a separate `markdown` block in each property's frontmatter.",
};
