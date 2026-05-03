export const type = "guide-header";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["guide-pages", "guide-categories"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary: "Renders a guide page's heading: title and optional subtitle.",
  template: "src/_includes/design-system/guide-header-block.html",
  notes:
    "Guide-only block. No parameters. Reads `title` and `subtitle` from the page data.",
};
