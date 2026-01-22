import { computeGallery } from "#collections/products.js";
import getConfig from "#data/config.js";
import strings from "#data/strings.js";
import {
  computeSpecs,
  getHighlightedSpecs,
  getListItemSpecs,
} from "#filters/spec-filters.js";
import {
  buildCartAttributes,
  computeOptions,
} from "#utils/product-cart-data.js";
import { buildPermalink, normaliseSlug } from "#utils/slug-utils.js";

const getProductMode = (data) => {
  const config = getConfig();
  return data.product_mode || config.product_mode;
};

export default {
  eleventyComputed: {
    categories: (data) => (data.categories || []).map(normaliseSlug),
    gallery: computeGallery,
    navigationParent: () => strings.product_name,
    product_mode: (data) => getProductMode(data),
    options: (data) => computeOptions(data, getProductMode(data)),
    permalink: (data) => buildPermalink(data, strings.product_permalink_dir),
    specs: computeSpecs,
    highlighted_specs: (data) => {
      const specs = computeSpecs(data);
      return getHighlightedSpecs(specs);
    },
    list_item_specs: (data) => {
      const specs = computeSpecs(data);
      return getListItemSpecs(specs);
    },
    cart_attributes: (data) => {
      const mode = getProductMode(data);
      return buildCartAttributes({
        title: data.title,
        subtitle: data.subtitle,
        options: computeOptions(data, mode),
        specs: computeSpecs(data),
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
      const options = computeOptions(data, mode);
      return options[0]?.max_quantity > 1;
    },
  },
};
