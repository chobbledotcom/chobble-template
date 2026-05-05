export const type = "event-map";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["events"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Embeds a map iframe using the page's `map_embed_src`, falling back to `config.map_embed_src`.",
  template: "src/_includes/design-system/event-map-block.html",
  notes:
    "Event-only block. No parameters. Renders nothing when no embed source is configured.",
};
