// Default field order matching original list-item.html
// Field names match include files: list-item-{field}.html
const DEFAULT_FIELDS = [
  "thumbnail",
  "link",
  "price",
  "date",
  "subtitle",
  "location",
  "event-date",
  "cart-button",
];

/**
 * Get the field order from config, or return defaults
 * @param {Object} config - The site config object
 * @returns {string[]} - Array of field names in order
 */
function getFieldOrder(config) {
  const fields = config?.list_item_fields;
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return DEFAULT_FIELDS;
  }
  return fields;
}

/**
 * Configure the list item fields filter
 * @param {Object} eleventyConfig - Eleventy config object
 */
function configureListItemFields(eleventyConfig) {
  eleventyConfig.addFilter("getListItemFields", getFieldOrder);
}

export { DEFAULT_FIELDS, getFieldOrder, configureListItemFields };
