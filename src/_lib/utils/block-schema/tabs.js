export const type = "tabs";

/* jscpd:ignore-start */
export const collections = ["products", "events", "properties"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary: "Renders the page's `tabs` array as a tabbed content section.",
  template: "src/_includes/design-system/tabs-block.html",
  notes:
    "Allowed on collections that surface a `tabs` field (products, events, properties). No parameters. Renders nothing when the page has no `tabs`.",
};
