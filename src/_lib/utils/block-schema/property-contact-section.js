export const type = "property-contact-section";
export const template = "design-system/blocks/item-contact-section.html";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["properties"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the inline contact section on a property page, delegating to the shared `item-contact-section.html` partial.",
  notes:
    "Property-only block. No parameters. Distinct from the `property-contact` block, which renders the standalone /contact/ page for a property. Honours the page's `formspark_id` override and falls back to `config.form_target`.",
};
