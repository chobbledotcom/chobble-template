export const type = "event-meta";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["events"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the event page's metadata: optional reviews-count link followed by the event categories list.",
  notes:
    "Event-only block. No parameters. Reads `event_categories` and `tags` from the page; reads `config.show_product_review_counts` from site data.",
};
