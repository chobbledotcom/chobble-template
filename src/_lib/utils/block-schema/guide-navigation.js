export const type = "guide-navigation";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["guide-pages"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary: "Renders a 'Back to <category>' breadcrumb link for a guide page.",
  template: "src/_includes/design-system/guide-navigation-block.html",
  notes:
    "Guide-page-only block. No parameters. Renders nothing when the page has no `guide-category` field.",
};
