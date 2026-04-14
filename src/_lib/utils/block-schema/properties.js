export const type = "properties";

export const schema = [];

export const docs = {
  summary: "Displays property listings (holiday lets) with filter controls.",
  template: "src/_includes/design-system/properties-block.html",
  scss: "src/css/design-system/_property.scss",
  notes:
    "No block-level parameters. Uses the global `collections.properties` and optional `filterPage` data for URL-based filtering.",
  params: {},
};

/** No block-specific fields — only the auto-injected container wrapper fields. */
export const cmsFields = {};
