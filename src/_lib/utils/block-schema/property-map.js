export const type = "property-map";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["properties"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Embeds a map iframe using the page's `map_embed_src`, falling back to `config.map_embed_src`.",
  template: "src/_includes/design-system/property-map-block.html",
  notes:
    "Property-only block. No parameters. Renders nothing when no embed source is configured.",
};
