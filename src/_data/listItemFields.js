import configJson from "#data/config.json" with { type: "json" };

export const DEFAULT_FIELDS = [
  "thumbnail",
  "link",
  "price",
  "date",
  "subtitle",
  "location",
  "event-date",
  "cart-button",
];

export const selectListItemFields = (configFields) =>
  Array.isArray(configFields) && configFields.length > 0
    ? configFields
    : DEFAULT_FIELDS;

export default selectListItemFields(configJson.list_item_fields);
