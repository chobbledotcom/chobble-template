/* jscpd:ignore-start -- block schema declaration data */
export const type = "news-meta";

export const collections = ["news"];

export const fields = {};

export const docs = {
  summary: "Renders a news post's metadata: author name plus the post date.",
  notes:
    "News-only block. No parameters. Reads `author` from the page data and renders it as plain text, falling back to a date-only block when there is no author.",
};

export const example = {
  type: "news-meta",
};
/* jscpd:ignore-end */
