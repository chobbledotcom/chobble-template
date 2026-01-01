/**
 * Template selector constants for Liquid templates
 *
 * Usage in templates: class="{{ selectors.CART_ITEM.NAME }}"
 *
 * This re-exports from the JS source of truth so both Liquid and JS
 * use the same class names.
 */

import {
  CART_ITEM_CLASSES,
  GALLERY_NAV_CLASSES,
  QUANTITY_CLASSES,
  QUOTE_CART_ITEM_CLASSES,
  QUOTE_CHECKOUT_ITEM_CLASSES,
  TEMPLATE_IDS,
} from "#assets/selectors.js";

export default {
  TEMPLATE_IDS,
  QUANTITY: QUANTITY_CLASSES,
  CART_ITEM: CART_ITEM_CLASSES,
  QUOTE_CART_ITEM: QUOTE_CART_ITEM_CLASSES,
  QUOTE_CHECKOUT_ITEM: QUOTE_CHECKOUT_ITEM_CLASSES,
  GALLERY_NAV: GALLERY_NAV_CLASSES,
};
