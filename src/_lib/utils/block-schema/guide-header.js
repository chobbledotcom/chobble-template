/* jscpd:ignore-start -- block schema declaration data */
export const type = "guide-header";

export const containerWidth = "full";

export const collections = ["guide-pages", "guide-categories"];

export const fields = {};

export const docs = {
  summary: "Renders a guide page's heading: title and optional subtitle.",
  notes:
    "Guide-only block. No parameters. Reads `title` and `subtitle` from the page data.",
};

export const example = {
  type: "guide-header",
};
/* jscpd:ignore-end */
