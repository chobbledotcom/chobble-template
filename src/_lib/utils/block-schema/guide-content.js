export const type = "guide-content";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["guide-pages", "guide-categories"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders a guide page's body content wrapped in a `.prose` container.",
  template: "src/_includes/design-system/guide-content-block.html",
  notes: "Guide-only block. No parameters. Renders the page's `{{ content }}`.",
};
