export const type = "property-gallery";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["properties"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the property page's gallery using the property-specific gallery layout (current image + thumbnails + slider).",
  template: "src/_includes/design-system/property-gallery-block.html",
  notes:
    "Property-only block. No parameters. Renders nothing when the property's `gallery` is empty.",
};
