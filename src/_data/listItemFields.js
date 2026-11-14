import getConfig from "#data/config.js";

// The merged site config (with DEFAULTS applied) is the single source of
// truth for which fields a list item renders, and in what order.
export default getConfig().list_item_fields;
