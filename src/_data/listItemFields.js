import configJson from "#data/config.json" with { type: "json" };

const DEFAULT_FIELDS = [
  "thumbnail",
  "link",
  "price",
  "date",
  "subtitle",
  "location",
  "event-date",
  "specs",
  "cart-button",
];

const selectListItemFields = (configFields) =>
  Array.isArray(configFields) && configFields.length > 0
    ? configFields
    : DEFAULT_FIELDS;

/**
 * @type {Array<string> & { _helpers?: { DEFAULT_FIELDS: Array<string>, selectListItemFields: Function } }}
 */
const listItemFields = selectListItemFields(configJson.list_item_fields);
// Adding helper methods for tests (Eleventy breaks with multiple exports)
listItemFields._helpers = { DEFAULT_FIELDS, selectListItemFields };

export default listItemFields;
