import { computeGallery } from "#collections/products.js";
import getConfig from "#data/config.js";
import { formatPrice } from "#utils/format-price.js";
import { linkableContent } from "#utils/linkable-content.js";
import {
  buildCartAttributes,
  computeOptions,
  getDefaultMaxQuantity,
} from "#utils/product-cart-data.js";
import { normaliseSlug } from "#utils/slug-utils.js";

/** @param {*} data */
const getProductMode = (data) => {
  const config = getConfig();
  return data.product_mode || config.product_mode;
};

export default {
  options: [],
  ...linkableContent("product", {
    categories: (data) => (data.categories || []).map(normaliseSlug),
    keywords: (data) => data.keywords || [],
    gallery: computeGallery,
    product_mode: (data) => getProductMode(data),
    options: (data) =>
      computeOptions(data, getProductMode(data), getDefaultMaxQuantity(data)),
    feature_link_items: (data) =>
      (data.features || []).map((text) => ({ text })),
    hire_stat_items: (data) => {
      const mode = getProductMode(data);
      if (mode !== "hire") return [];
      const options = computeOptions(data, mode, getDefaultMaxQuantity(data));
      const { currency } = getConfig();
      return options.map((opt) => ({
        value: formatPrice(currency, opt.unit_price),
        label: `${opt.days} day${opt.days === 1 ? "" : "s"}`,
      }));
    },
    cart_attributes: (data) => {
      const mode = getProductMode(data);
      const defaultMaxQuantity = getDefaultMaxQuantity(data);
      return buildCartAttributes({
        name: data.name,
        subtitle: data.subtitle,
        options: computeOptions(data, mode, defaultMaxQuantity),
        mode,
      });
    },
    cart_btn_text: (data) => {
      const mode = getProductMode(data);
      return mode === "hire" ? "Add To Quote" : "Add to Cart";
    },
    has_single_cart_option: (data) => {
      const mode = getProductMode(data);
      return mode === "hire" || (data.options || []).length <= 1;
    },
    show_cart_quantity_selector: (data) => {
      const config = getConfig();
      if (config.cart_mode !== "quote") return false;
      const mode = getProductMode(data);
      const defaultMaxQuantity = getDefaultMaxQuantity(data);
      const options = computeOptions(data, mode, defaultMaxQuantity);
      const maxQuantity = options[0]?.max_quantity;
      return maxQuantity != null && maxQuantity > 1;
    },
  }),
};
