export const type = "property-guides";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["properties"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Lists guide categories linked to the current property (via the `guideCategoriesByProperty` filter), styled as a feature grid.",
  template: "src/_includes/design-system/property-guides-block.html",
  notes:
    "Property-only block. No parameters. Renders nothing when no guides are linked to the property.",
};
