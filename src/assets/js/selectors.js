// Template selector constants
// Single source of truth for class names used in HTML templates and JS
// These constants should be tested against both HTML and CSS to ensure consistency

// Helper to convert class name to CSS selector
export const cls = (className) => `.${className}`;

// Template IDs
export const TEMPLATE_IDS = {
  CART_ITEM: "cart-item-template",
  QUOTE_CART_ITEM: "quote-cart-item-template",
  QUOTE_CHECKOUT_ITEM: "quote-checkout-item-template",
  GALLERY_NAV_PREV: "gallery-popup-nav-prev",
  GALLERY_NAV_NEXT: "gallery-popup-nav-next",
};

// Shared quantity controls classes (used in multiple templates)
export const QUANTITY_CLASSES = {
  CONTAINER: "cart-item-quantity",
  DECREASE: "qty-decrease",
  INCREASE: "qty-increase",
  INPUT: "qty-input",
};

// Cart item template classes
export const CART_ITEM_CLASSES = {
  CONTAINER: "cart-item",
  NAME: "cart-item-name",
  PRICE: "cart-item-price",
  REMOVE: "cart-item-remove",
};

// Quote cart item template classes
export const QUOTE_CART_ITEM_CLASSES = {
  CONTAINER: "quote-cart-item",
  NAME: "quote-cart-item-name",
  PRICE: "quote-cart-item-price",
  SPECS: "quote-cart-item-specs",
  REMOVE: "quote-cart-item-remove",
};

// Quote checkout item template classes
export const QUOTE_CHECKOUT_ITEM_CLASSES = {
  CONTAINER: "quote-checkout-item",
  NAME: "quote-checkout-item-name",
  QTY: "quote-checkout-item-qty",
  PRICE: "quote-checkout-item-price",
};

// Gallery popup navigation classes
export const GALLERY_NAV_CLASSES = {
  PREV: "popup-nav-prev",
  NEXT: "popup-nav-next",
};

// Complete template definitions for testing
// Maps template IDs to their required classes
export const TEMPLATE_DEFINITIONS = {
  [TEMPLATE_IDS.CART_ITEM]: {
    id: TEMPLATE_IDS.CART_ITEM,
    classes: [
      CART_ITEM_CLASSES.CONTAINER,
      CART_ITEM_CLASSES.NAME,
      CART_ITEM_CLASSES.PRICE,
      CART_ITEM_CLASSES.REMOVE,
      QUANTITY_CLASSES.INPUT,
    ],
  },
  [TEMPLATE_IDS.QUOTE_CART_ITEM]: {
    id: TEMPLATE_IDS.QUOTE_CART_ITEM,
    classes: [
      QUOTE_CART_ITEM_CLASSES.CONTAINER,
      QUOTE_CART_ITEM_CLASSES.NAME,
      QUOTE_CART_ITEM_CLASSES.PRICE,
      QUOTE_CART_ITEM_CLASSES.SPECS,
      QUOTE_CART_ITEM_CLASSES.REMOVE,
      QUANTITY_CLASSES.INPUT,
    ],
  },
  [TEMPLATE_IDS.QUOTE_CHECKOUT_ITEM]: {
    id: TEMPLATE_IDS.QUOTE_CHECKOUT_ITEM,
    classes: [
      QUOTE_CHECKOUT_ITEM_CLASSES.CONTAINER,
      QUOTE_CHECKOUT_ITEM_CLASSES.NAME,
      QUOTE_CHECKOUT_ITEM_CLASSES.QTY,
      QUOTE_CHECKOUT_ITEM_CLASSES.PRICE,
    ],
  },
  [TEMPLATE_IDS.GALLERY_NAV_PREV]: {
    id: TEMPLATE_IDS.GALLERY_NAV_PREV,
    classes: [GALLERY_NAV_CLASSES.PREV],
  },
  [TEMPLATE_IDS.GALLERY_NAV_NEXT]: {
    id: TEMPLATE_IDS.GALLERY_NAV_NEXT,
    classes: [GALLERY_NAV_CLASSES.NEXT],
  },
};
