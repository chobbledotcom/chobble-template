export const type = "property-features";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["properties"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the property's `features` array as a bulleted list under a 'Features' heading.",
  template: "src/_includes/design-system/property-features-block.html",
  notes:
    "Property-only block. No parameters. Renders nothing when the page's `features` array is empty.",
};
