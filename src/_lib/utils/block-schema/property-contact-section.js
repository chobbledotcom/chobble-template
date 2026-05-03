export const type = "property-contact-section";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["properties"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the inline contact section on a property page (delegates to `item-contact-section.html`).",
  template: "src/_includes/design-system/property-contact-section-block.html",
  notes:
    "Property-only block. No parameters. Distinct from the `property-contact` block, which renders the standalone /contact/ page for a property. Honours the page's `formspark_id` override and falls back to `config.form_target`.",
};
