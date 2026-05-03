import { resolveConfigList } from "#utils/config-list.js";

const DEFAULT_CATEGORY_ORDER = [
  "category-title.html",
  "category-parent-link.html",
  "category-content.html",
  "category-faqs.html",
  "category-subcategories.html",
  "category-products.html",
  "category-below-products.html",
];

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

/** @param {unknown} configOrder */
const getCategoryOrder = (configOrder) =>
  resolveConfigList(configOrder, DEFAULT_CATEGORY_ORDER);

/** @param {unknown} configFields */
const selectListItemFields = (configFields) =>
  resolveConfigList(configFields, DEFAULT_LIST_ITEM_FIELDS);

export { getCategoryOrder, selectListItemFields };
