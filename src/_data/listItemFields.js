import configJson from "#data/config.json" with { type: "json" };

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

const selectListItemFields = (configFields) =>
  Array.isArray(configFields) && configFields.length > 0
    ? configFields
    : DEFAULT_FIELDS;

const listItemFields = selectListItemFields(configJson.list_item_fields);
// @ts-expect-error - Adding helper methods for tests (Eleventy breaks with multiple exports)
listItemFields._helpers = { DEFAULT_FIELDS, selectListItemFields };

export default listItemFields;
