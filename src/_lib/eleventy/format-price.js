import getConfig from "#data/config.js";
import { formatPrice, getCurrencySymbol } from "#utils/format-price.js";

export const configureFormatPrice = (eleventyConfig) => {
  const { currency } = getConfig();

  eleventyConfig.addFilter("to_price", (value) => formatPrice(currency, value));

  eleventyConfig.addGlobalData("currency_symbol", getCurrencySymbol(currency));
};
