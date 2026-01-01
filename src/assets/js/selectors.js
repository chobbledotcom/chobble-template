// Template selector constants
// Single source of truth for class names used in HTML templates and JS

// ===========================================
// Source of truth: Class names (for HTML)
// ===========================================

export const CLASSES = {
  QUANTITY: {
    CONTAINER: "cart-item-quantity",
    DECREASE: "qty-decrease",
    INCREASE: "qty-increase",
    INPUT: "qty-input",
  },
  CART_ITEM: {
    CONTAINER: "cart-item",
    NAME: "cart-item-name",
    PRICE: "cart-item-price",
    REMOVE: "cart-item-remove",
  },
  QUOTE_CART_ITEM: {
    CONTAINER: "quote-cart-item",
    NAME: "quote-cart-item-name",
    PRICE: "quote-cart-item-price",
    SPECS: "quote-cart-item-specs",
    REMOVE: "quote-cart-item-remove",
  },
  QUOTE_CHECKOUT_ITEM: {
    CONTAINER: "quote-checkout-item",
    NAME: "quote-checkout-item-name",
    QTY: "quote-checkout-item-qty",
    PRICE: "quote-checkout-item-price",
  },
  GALLERY_NAV: {
    PREV: "popup-nav-prev",
    NEXT: "popup-nav-next",
  },
};

// ===========================================
// Source of truth: Template IDs
// ===========================================

export const IDS = {
  CART_ITEM: "cart-item-template",
  QUOTE_CART_ITEM: "quote-cart-item-template",
  QUOTE_CHECKOUT_ITEM: "quote-checkout-item-template",
  GALLERY_NAV_PREV: "gallery-popup-nav-prev",
  GALLERY_NAV_NEXT: "gallery-popup-nav-next",
};

// ===========================================
// Auto-generated: CSS selectors (for JS)
// ===========================================

const toSelectors = (obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) =>
      typeof v === "object" ? [k, toSelectors(v)] : [k, `.${v}`],
    ),
  );

export const SEL = toSelectors(CLASSES);

// ===========================================
// Template definitions (for testing)
// ===========================================

export const TEMPLATE_DEFINITIONS = {
  [IDS.CART_ITEM]: {
    id: IDS.CART_ITEM,
    classes: [
      CLASSES.CART_ITEM.CONTAINER,
      CLASSES.CART_ITEM.NAME,
      CLASSES.CART_ITEM.PRICE,
      CLASSES.CART_ITEM.REMOVE,
      CLASSES.QUANTITY.INPUT,
    ],
  },
  [IDS.QUOTE_CART_ITEM]: {
    id: IDS.QUOTE_CART_ITEM,
    classes: [
      CLASSES.QUOTE_CART_ITEM.CONTAINER,
      CLASSES.QUOTE_CART_ITEM.NAME,
      CLASSES.QUOTE_CART_ITEM.PRICE,
      CLASSES.QUOTE_CART_ITEM.SPECS,
      CLASSES.QUOTE_CART_ITEM.REMOVE,
      CLASSES.QUANTITY.INPUT,
    ],
  },
  [IDS.QUOTE_CHECKOUT_ITEM]: {
    id: IDS.QUOTE_CHECKOUT_ITEM,
    classes: [
      CLASSES.QUOTE_CHECKOUT_ITEM.CONTAINER,
      CLASSES.QUOTE_CHECKOUT_ITEM.NAME,
      CLASSES.QUOTE_CHECKOUT_ITEM.QTY,
      CLASSES.QUOTE_CHECKOUT_ITEM.PRICE,
    ],
  },
  [IDS.GALLERY_NAV_PREV]: {
    id: IDS.GALLERY_NAV_PREV,
    classes: [CLASSES.GALLERY_NAV.PREV],
  },
  [IDS.GALLERY_NAV_NEXT]: {
    id: IDS.GALLERY_NAV_NEXT,
    classes: [CLASSES.GALLERY_NAV.NEXT],
  },
};
