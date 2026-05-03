export const type = "property-tabs";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["properties"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary: "Renders the property's `tabs` array as a tabbed content section.",
  template: "src/_includes/design-system/property-tabs-block.html",
  notes:
    "Property-only block. No parameters. Renders nothing when the page has no `tabs`.",
};
