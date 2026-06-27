import getConfig from "#data/config.js";
import { pick } from "#toolkit/fp/array.js";
import { isAmbiguousPrice, parsePrice } from "#utils/price-utils.js";
import {
  buildCartAttributes,
  getDefaultMaxQuantity,
} from "#utils/product-cart-data.js";
import { normaliseSlug } from "#utils/slug-utils.js";

/**
 * Resolve the single buy option for a menu item, or `null` when the item is
 * not cart-enabled. A menu item is cart-enabled only when:
 *   - `config.cart_mode` is active (quote or stripe)
 *   - the price is present, parseable, and unambiguous
 *   - in Stripe mode, a top-level `sku` is present
 *
 * Returns the normalized option (with `sku`, `days`, `max_quantity`) so it
 * can be passed straight to `buildCartAttributes`.
 *
 * @param {*} data - Menu item data
 * @returns {{ name: string, unit_price: number, max_quantity: number | null, sku: string | null, days: null } | null}
 */
const resolveMenuCartOption = (data) => {
  if (isAmbiguousPrice(data.price)) return null;
  const unitPrice = parsePrice(null)(data.price);
  if (unitPrice == null) return null;

  const mode = getConfig().cart_mode;
  if (!mode) return null;
  if (mode === "stripe" && !data.sku) return null;

  return {
    name: data.name,
    unit_price: unitPrice,
    max_quantity: getDefaultMaxQuantity(data),
    sku: data.sku != null ? data.sku : null,
    days: null,
  };
};

/** @type {{ eleventyComputed: Record<string, (data: *) => *> }} */
export default {
  eleventyComputed: {
    dietaryKeys: (data) => {
      const dietaryIndicators = data.dietaryIndicators || {};

      return Object.values(dietaryIndicators)
        .filter((indicator) => data[indicator.field])
        .map(pick(["symbol", "label"]));
    },
    menu_categories: (data) => {
      const categories = data.menu_categories || [];
      return categories.map(normaliseSlug);
    },
    cart_max_quantity: (data) => getDefaultMaxQuantity(data),
    has_single_cart_option: () => true,
    cart_attributes: (data) => {
      const option = resolveMenuCartOption(data);
      if (!option) return null;

      return buildCartAttributes({
        name: data.name,
        subtitle: data.description,
        options: [option],
        mode: "buy",
      });
    },
    show_cart_quantity_selector: (data) => resolveMenuCartOption(data) !== null,
    cart_btn_text: () => {
      const mode = getConfig().cart_mode;
      return mode === "quote" ? "Add To Quote" : "Add to Cart";
    },
  },
};
