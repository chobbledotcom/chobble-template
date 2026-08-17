export const type = "guide-categories";

export const fields = {};

export const docs = {
  summary: "Displays the site-wide guide categories.",
  notes:
    "No block-level parameters. Uses the global `collections.guide-categories`, minus any category with a `property` — those belong to a single property's guide and are listed by the `property-guides` block on the property page instead.",
};
