// Template selector constants
// Single source of truth for selectors used in HTML templates and JS
// These constants should be tested against both HTML and CSS to ensure consistency

// Template IDs
export const TEMPLATE_IDS = {
  CART_ITEM: "cart-item-template",
  QUOTE_CART_ITEM: "quote-cart-item-template",
  QUOTE_CHECKOUT_ITEM: "quote-checkout-item-template",
  GALLERY_NAV_PREV: "gallery-popup-nav-prev",
  GALLERY_NAV_NEXT: "gallery-popup-nav-next",
};

// Shared quantity controls selectors (used in multiple templates)
export const QUANTITY_SELECTORS = {
  CONTAINER: ".cart-item-quantity",
  DECREASE: ".qty-decrease",
  INCREASE: ".qty-increase",
  INPUT: ".qty-input",
  DATA_NAME: "[data-name]",
};

// Cart item template selectors
export const CART_ITEM_SELECTORS = {
  CONTAINER: ".cart-item",
  NAME: ".cart-item-name",
  PRICE: ".cart-item-price",
  REMOVE: ".cart-item-remove",
};

// Quote cart item template selectors
export const QUOTE_CART_ITEM_SELECTORS = {
  CONTAINER: ".quote-cart-item",
  NAME: ".quote-cart-item-name",
  PRICE: ".quote-cart-item-price",
  SPECS: ".quote-cart-item-specs",
  REMOVE: ".quote-cart-item-remove",
};

// Quote checkout item template selectors
export const QUOTE_CHECKOUT_ITEM_SELECTORS = {
  CONTAINER: ".quote-checkout-item",
  NAME: ".quote-checkout-item-name",
  QTY: ".quote-checkout-item-qty",
  PRICE: ".quote-checkout-item-price",
};

// Gallery popup navigation selectors
export const GALLERY_NAV_SELECTORS = {
  PREV: ".popup-nav-prev",
  NEXT: ".popup-nav-next",
};

// Complete template definitions for testing
// Maps template IDs to their required selectors
export const TEMPLATE_DEFINITIONS = {
  [TEMPLATE_IDS.CART_ITEM]: {
    id: TEMPLATE_IDS.CART_ITEM,
    selectors: [
      CART_ITEM_SELECTORS.CONTAINER,
      CART_ITEM_SELECTORS.NAME,
      CART_ITEM_SELECTORS.PRICE,
      CART_ITEM_SELECTORS.REMOVE,
      QUANTITY_SELECTORS.INPUT,
      QUANTITY_SELECTORS.DATA_NAME,
    ],
  },
  [TEMPLATE_IDS.QUOTE_CART_ITEM]: {
    id: TEMPLATE_IDS.QUOTE_CART_ITEM,
    selectors: [
      QUOTE_CART_ITEM_SELECTORS.CONTAINER,
      QUOTE_CART_ITEM_SELECTORS.NAME,
      QUOTE_CART_ITEM_SELECTORS.PRICE,
      QUOTE_CART_ITEM_SELECTORS.SPECS,
      QUOTE_CART_ITEM_SELECTORS.REMOVE,
      QUANTITY_SELECTORS.INPUT,
      QUANTITY_SELECTORS.DATA_NAME,
    ],
  },
  [TEMPLATE_IDS.QUOTE_CHECKOUT_ITEM]: {
    id: TEMPLATE_IDS.QUOTE_CHECKOUT_ITEM,
    selectors: [
      QUOTE_CHECKOUT_ITEM_SELECTORS.CONTAINER,
      QUOTE_CHECKOUT_ITEM_SELECTORS.NAME,
      QUOTE_CHECKOUT_ITEM_SELECTORS.QTY,
      QUOTE_CHECKOUT_ITEM_SELECTORS.PRICE,
    ],
  },
  [TEMPLATE_IDS.GALLERY_NAV_PREV]: {
    id: TEMPLATE_IDS.GALLERY_NAV_PREV,
    selectors: [GALLERY_NAV_SELECTORS.PREV],
  },
  [TEMPLATE_IDS.GALLERY_NAV_NEXT]: {
    id: TEMPLATE_IDS.GALLERY_NAV_NEXT,
    selectors: [GALLERY_NAV_SELECTORS.NEXT],
  },
};
