import getConfig from "#data/config.js";
import { pick } from "#toolkit/fp/array.js";
import { buildCartAttributes } from "#utils/product-cart-data.js";
import { normaliseSlug } from "#utils/slug-utils.js";

const parseMenuPrice = (price) => {
  if (typeof price === "number") return price;
  if (!price) return null;

  const matches = String(price).match(/[\d.]+/);
  return matches ? Number.parseFloat(matches[0]) : null;
};

const getDefaultMaxQuantity = () => {
  const config = getConfig();
  return config.default_max_quantity;
};

const buildMenuCartAttributes = (data) => {
  const unitPrice = parseMenuPrice(data.price);
  if (unitPrice == null) return null;

  return buildCartAttributes({
    name: data.name,
    subtitle: data.description,
    options: [
      {
        name: data.name,
        unit_price: unitPrice,
        max_quantity: getDefaultMaxQuantity(),
        sku: null,
        days: null,
      },
    ],
    mode: "buy",
  });
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
    cart_attributes: buildMenuCartAttributes,
    cart_btn_text: () => "Add To Quote",
  },
};
