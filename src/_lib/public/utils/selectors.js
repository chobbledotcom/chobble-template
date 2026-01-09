// Template selector constants
// IDs for <template> elements cloned by JavaScript

export const IDS = Object.fromEntries(
  [
    "CALENDAR_MONTH",
    "CART_ITEM",
    "QUOTE_CART_ITEM",
    "QUOTE_CHECKOUT_ITEM",
    "QUOTE_PRICE",
    "QUOTE_PRICE_ITEM",
    "QUOTE_PRICE_DETAIL",
    "QUOTE_STEP_LIST",
    "QUOTE_STEP_INDICATOR",
    "GALLERY_NAV_PREV",
    "GALLERY_NAV_NEXT",
  ].map((k) => [k, `${k.toLowerCase().replace(/_/g, "-")}-template`]),
);
