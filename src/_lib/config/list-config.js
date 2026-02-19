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

const DEFAULT_PROPERTY_ORDER = [
  "property/header.html",
  "property/freetobook.html",
  "property/gallery.html",
  "property/content.html",
  "property/features.html",
  "property/guides.html",
  "property/specs.html",
  "property/tabs.html",
  "property/map.html",
  "property/reviews.html",
  "faqs.html",
  "property/contact.html",
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

const getCategoryOrder = (configOrder) =>
  resolveConfigList(configOrder, DEFAULT_CATEGORY_ORDER);

const getPropertyOrder = (configOrder) =>
  resolveConfigList(configOrder, DEFAULT_PROPERTY_ORDER);

const selectListItemFields = (configFields) =>
  resolveConfigList(configFields, DEFAULT_LIST_ITEM_FIELDS);

export { getCategoryOrder, getPropertyOrder, selectListItemFields };
