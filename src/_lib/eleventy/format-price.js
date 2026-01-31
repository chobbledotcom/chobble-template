import config from "#data/config.json" with { type: "json" };
import {
  formatPriceNumber,
  formatPriceWithSymbol,
} from "#utils/format-price.js";

export const configureFormatPrice = (eleventyConfig) => {
  eleventyConfig.addFilter("format_price", (value) =>
    formatPriceWithSymbol(config.currency_symbol, value),
  );

  eleventyConfig.addFilter("format_price_number", formatPriceNumber);
};
