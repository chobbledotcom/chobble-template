export const type = "guide-pages-list";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["guide-categories"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Lists the guide pages that belong to the current guide category (filtered via `guidesByCategory`).",
  notes:
    "Guide-category-only block. No parameters. A guide page with a `property` is only listed when the category carries the same `property`. Renders nothing when there are no pages left to show.",
};
