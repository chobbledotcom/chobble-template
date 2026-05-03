export const type = "property-header";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["properties"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders a property page's heading: title, optional subtitle, and optional price-per-night.",
  template: "src/_includes/design-system/property-header-block.html",
  notes:
    "Property-only block. No parameters. Reads `title`, `subtitle`, and `price_per_night` from the property page data.",
};
