import { computeGallery } from "#collections/products.js";
import getConfig from "#data/config.js";
import {
  computeSpecs,
  getHighlightedSpecs,
  getListItemSpecs,
} from "#filters/spec-filters.js";
import { linkableContent } from "#utils/linkable-content.js";
import {
  buildCartAttributes,
  computeOptions,
} from "#utils/product-cart-data.js";
import { normaliseSlug } from "#utils/slug-utils.js";

/** @param {*} data */
const getProductMode = (data) => {
  const config = getConfig();
  return data.product_mode || config.product_mode;
};

/** @param {*} data */
const getDefaultMaxQuantity = (data) => {
  if (data.max_quantity != null) {
    return data.max_quantity;
  }
  const config = getConfig();
  return config.default_max_quantity;
};

export default linkableContent("product", {
  /** @param {*} data */
  categories: (data) => (data.categories || []).map(normaliseSlug),
  /** @param {*} data */
  keywords: (data) => data.keywords || [],
  gallery: computeGallery,
  /** @param {*} data */
  product_mode: (data) => getProductMode(data),
  /** @param {*} data */
  options: (data) =>
    computeOptions(data, getProductMode(data), getDefaultMaxQuantity(data)),
  /** @param {*} data */
  specs: (data) => computeSpecs(data.specs || []),
  /** @param {*} data */
  highlighted_specs: (data) => {
    const specs = computeSpecs(data.specs || []);
    return getHighlightedSpecs(specs);
  },
  /** @param {*} data */
  list_item_specs: (data) => {
    const specs = computeSpecs(data.specs || []);
    return getListItemSpecs(specs);
  },
  /** @param {*} data */
  cart_attributes: (data) => {
    const mode = getProductMode(data);
    const defaultMaxQuantity = getDefaultMaxQuantity(data);
    return buildCartAttributes({
      title: data.title,
      subtitle: data.subtitle,
      options: computeOptions(data, mode, defaultMaxQuantity),
      specs: computeSpecs(data.specs || []),
      mode,
    });
  },
  /** @param {*} data */
  cart_btn_text: (data) => {
    const mode = getProductMode(data);
    return mode === "hire" ? "Add To Quote" : "Add to Cart";
  },
  /** @param {*} data */
  has_single_cart_option: (data) => {
    const mode = getProductMode(data);
    return mode === "hire" || (data.options || []).length <= 1;
  },
  /** @param {*} data */
  show_cart_quantity_selector: (data) => {
    const config = getConfig();
    if (config.cart_mode !== "quote") return false;
    const mode = getProductMode(data);
    const defaultMaxQuantity = getDefaultMaxQuantity(data);
    const options = computeOptions(data, mode, defaultMaxQuantity);
    const maxQuantity = options[0]?.max_quantity;
    return maxQuantity !== undefined && maxQuantity > 1;
  },
});
