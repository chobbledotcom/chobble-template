export const type = "faqs";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["properties", "guide-pages"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the page's `faqs` array as a definition list under a 'Frequently Asked Questions' heading.",
  template: "src/_includes/design-system/faqs-block.html",
  notes:
    "Property and guide-page block. No parameters. Reads `faqs` from the page data. Renders nothing when the array is empty.",
};
