import { resolveConfigList } from "#utils/config-list.js";

const DEFAULT_LIST_ITEM_FIELDS = [
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

/** @param {unknown} configFields */
const selectListItemFields = (configFields) =>
  resolveConfigList(configFields, DEFAULT_LIST_ITEM_FIELDS);

export { selectListItemFields };
