/**
 * Template selector constants for Liquid templates
 *
 * Usage: class="{{ selectors.CART_ITEM.NAME }}"
 *        id="{{ selectors.IDS.CART_ITEM }}"
 */

import { CLASSES, IDS } from "#assets/selectors.js";

export default {
  ...CLASSES,
  IDS,
};
