export const type = "guide-pages-list";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["guide-categories"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Lists the guide pages that belong to the current guide category (filtered via `guidesByCategory`).",
  template: "src/_includes/design-system/guide-pages-list-block.html",
  notes:
    "Guide-category-only block. No parameters. Renders nothing when there are no pages in the category.",
};
