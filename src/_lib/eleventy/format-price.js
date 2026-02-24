import getConfig from "#data/config.js";
import { formatPrice } from "#utils/format-price.js";

/** @param {*} eleventyConfig */
export const configureFormatPrice = (eleventyConfig) => {
  const { currency } = getConfig();

  eleventyConfig.addFilter(
    "to_price",
    /** @param {string | number} value */
    (value) => formatPrice(currency, value),
  );
};
