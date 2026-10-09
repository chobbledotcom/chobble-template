/* jscpd:ignore-start -- block schema declaration data */
export const type = "guide-categories";

export const fields = {};

export const docs = {
  summary: "Displays the site-wide guide categories.",
  notes:
    "No block-level parameters. Uses the global `collections.guide-categories`, minus any category with a `property`, which belongs to a single property's guide.",
};

export const example = {
  type: "guide-categories",
};
/* jscpd:ignore-end */
