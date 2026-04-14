export const type = "content";

export const schema = [];

export const docs = {
  summary:
    "Outputs the page's `content` property (from markdown body below frontmatter).",
  template: "src/_includes/design-system/content-block.html",
  notes:
    "No parameters. Renders `{{ content }}` if non-empty. Used for pages that combine blocks with traditional markdown content.",
  params: {},
};

/** No block-specific fields — only the auto-injected container wrapper fields. */
export const cmsFields = {};
