// Template selector constants
// IDs for <template> elements cloned by JavaScript

export const IDS = Object.fromEntries(
  [
    "CALENDAR_MONTH",
    "CART_ITEM",
    "QUOTE_CART_ITEM",
    "QUOTE_CHECKOUT_ITEM",
    "GALLERY_NAV_PREV",
    "GALLERY_NAV_NEXT",
  ].map((k) => [k, `${k.toLowerCase().replace(/_/g, "-")}-template`]),
);
