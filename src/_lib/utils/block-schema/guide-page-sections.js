export const type = "guide-page-sections";

export const containerWidth = "full";

export const collections = ["guide-pages"];

export const fields = {};

export const docs = {
  summary:
    "Renders the configured `guidePageOrder` list of section includes for a single guide page.",
  template: "src/_includes/design-system/guide-page-sections-block.html",
  notes:
    "Guide-page-only block. No parameters. The list of sections is driven by `config.guide_page_order`. Each entry is a path under src/_includes/ and is rendered in order.",
};
