import { pick } from "#toolkit/fp/array.js";
import { parsePrice } from "#utils/price-utils.js";
import {
  buildCartAttributes,
  getDefaultMaxQuantity,
} from "#utils/product-cart-data.js";
import { normaliseSlug } from "#utils/slug-utils.js";

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
    cart_attributes: (data) => {
      const unitPrice = parsePrice(null)(data.price);
      if (unitPrice == null) return null;

      return buildCartAttributes({
        name: data.name,
        subtitle: data.description,
        options: [
          {
            name: data.name,
            unit_price: unitPrice,
            max_quantity: getDefaultMaxQuantity(data),
            sku: null,
            days: null,
          },
        ],
        mode: "buy",
      });
    },
    cart_btn_text: () => "Add To Quote",
  },
};
