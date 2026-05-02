export const type = "property-sections";

export const containerWidth = "full";

export const collections = ["properties"];

export const fields = {};

export const docs = {
  summary:
    "Renders the configured `propertyOrder` list of section includes for a single property page.",
  template: "src/_includes/design-system/property-sections-block.html",
  notes:
    "Property-only block. No parameters. The list of sections is driven by `config.property_order` (defaulting to DEFAULT_PROPERTY_ORDER in src/_lib/config/list-config.js). Each entry is a path under src/_includes/ and is rendered in order.",
};
