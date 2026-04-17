export const type = "properties";

export const fields = {};

export const docs = {
  summary: "Displays property listings (holiday lets) with filter controls.",
  template: "src/_includes/design-system/properties-block.html",
  scss: "src/css/design-system/_property.scss",
  notes:
    "No block-level parameters. Uses the global `collections.properties` and optional `filterPage` data for URL-based filtering.",
};
