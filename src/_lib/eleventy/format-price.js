import config from "#data/config.json" with { type: "json" };
import { formatPrice, getCurrencySymbol } from "#utils/format-price.js";

export const configureFormatPrice = (eleventyConfig) => {
  eleventyConfig.addFilter("format_price", (value) =>
    formatPrice(config.currency, value),
  );

  eleventyConfig.addGlobalData(
    "currency_symbol",
    getCurrencySymbol(config.currency),
  );
};
