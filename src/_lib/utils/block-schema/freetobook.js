export const type = "freetobook";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["properties"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders a Freetobook booking iframe inside a collapsible details element.",
  template: "src/_includes/design-system/freetobook-block.html",
  notes:
    "Property-only block. No parameters. Renders nothing when the property's `freetobook_token` is not set.",
};
