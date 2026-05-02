export const type = "guide-category-sections";

export const containerWidth = "full";

export const collections = ["guide-categories"];

export const fields = {};

export const docs = {
  summary:
    "Renders the configured `guideCategoryOrder` list of section includes for a single guide-category landing page.",
  template: "src/_includes/design-system/guide-category-sections-block.html",
  notes:
    "Guide-category-only block. No parameters. The list of sections is driven by `config.guide_category_order`. Each entry is a path under src/_includes/ and is rendered in order.",
};
