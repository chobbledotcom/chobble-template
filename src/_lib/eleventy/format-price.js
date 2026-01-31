import getConfig from "#data/config.js";
import { formatPrice } from "#utils/format-price.js";

export const configureFormatPrice = (eleventyConfig) => {
  const { currency } = getConfig();

  eleventyConfig.addFilter("to_price", (value) => formatPrice(currency, value));
};
