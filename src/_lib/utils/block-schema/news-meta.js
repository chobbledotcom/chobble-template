export const type = "news-meta";

export const collections = ["news"];

export const fields = {};

export const docs = {
  summary:
    "Renders a news post's metadata: author name (linking to their team page) with optional thumbnail, plus the post date.",
  template: "src/_includes/design-system/news-meta-block.html",
  notes:
    "News-only block. No parameters. Reads `authorSlug` from the page data and looks up the matching team member in `collections.team`. Renders the author's image when present, falling back to a date-only block when there is no author.",
};
