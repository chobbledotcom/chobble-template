export const type = "event-products";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["events"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Lists products linked to the current event, combining explicit `products` references with reverse-lookup matches.",
  template: "src/_includes/design-system/event-products-block.html",
  notes:
    "Event-only block. No parameters. Renders nothing when no products are linked to the event.",
};
