/* jscpd:ignore-start -- block schema declaration data */
export const type = "guide-navigation";

export const containerWidth = "full";

export const collections = ["guide-pages"];

export const fields = {};

export const docs = {
  summary: "Renders a 'Back to <category>' breadcrumb link for a guide page.",
  notes:
    "Guide-page-only block. No parameters. Renders nothing when the page has no `guide-category` field.",
};

export const example = {
  type: "guide-navigation",
};
/* jscpd:ignore-end */
