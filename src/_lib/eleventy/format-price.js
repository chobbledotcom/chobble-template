/**
 * Formats a price for display:
 * - Whole numbers (e.g. 3.00, 10) → "3", "10" (no decimals)
 * - Fractional prices (e.g. 3.5, 3.50) → "3.50" (two decimal places)
 * - String values passed through unchanged (e.g. "£30")
 */
const formatPrice = (value) => {
  if (typeof value === "string" && value.includes("£")) {
    return value;
  }

  const num = Number(value);

  if (Number.isNaN(num)) {
    return value;
  }

  if (num % 1 === 0) {
    return String(num);
  }

  return num.toFixed(2);
};

export const configureFormatPrice = (eleventyConfig) => {
  eleventyConfig.addFilter("format_price", formatPrice);
};

export { formatPrice };
