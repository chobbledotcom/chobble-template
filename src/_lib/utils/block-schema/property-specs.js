export const type = "property-specs";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["properties"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the property's `specs` array as a specifications grid under a 'Specifications' heading.",
  template: "src/_includes/design-system/property-specs-block.html",
  notes:
    "Property-only block. No parameters. Renders nothing when the page has no `specs`.",
};
