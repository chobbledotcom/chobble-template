import config from "#data/config.json" with { type: "json" };
import {
  formatPriceNumber,
  formatPriceWithSymbol,
} from "#utils/format-price.js";

const symbol = config.currency_symbol;

export const configureFormatPrice = (eleventyConfig) => {
  eleventyConfig.addFilter("format_price", (value) =>
    formatPriceWithSymbol(symbol, value),
  );

  eleventyConfig.addFilter("format_price_number", formatPriceNumber);
};
