export const type = "property-contact";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["pages"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders a contact form scoped to the current property page (paginated from `collections.propertiesWithContactPage`).",
  template: "src/_includes/design-system/property-contact-block.html",
  notes:
    "Pages-only block. No parameters. Reads `item` from pagination, overrides the contact form target with the property's formspark_id, and links back to the property page.",
};
