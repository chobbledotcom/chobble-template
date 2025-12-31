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

const configFields = configJson.list_item_fields;

export default Array.isArray(configFields) && configFields.length > 0
  ? configFields
  : DEFAULT_FIELDS;
