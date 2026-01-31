/**
 * Core price formatting (no currency symbol).
 *
 * - Whole numbers (3.00, 10) → "3", "10"
 * - Fractional prices (3.5, 3.50) → "3.50" (two decimal places)
 * - Strings containing a currency symbol are passed through unchanged
 * - Non-numeric strings are passed through unchanged
 */
export const formatPriceNumber = (value) => {
  if (typeof value === "string" && /[£$€¥]/.test(value)) {
    return value;
  }

  const num = Number(value);

  if (Number.isNaN(num)) {
    return String(value);
  }

  if (num % 1 === 0) {
    return String(num);
  }

  return num.toFixed(2);
};

/**
 * Format a price with currency symbol prepended.
 *
 * @param {string} symbol - Currency symbol, e.g. "£"
 * @param {number|string} value - Price value
 * @returns {string} Formatted price, e.g. "£3.50" or "£10"
 */
export const formatPriceWithSymbol = (symbol, value) => {
  const formatted = formatPriceNumber(value);

  // Already contains a currency symbol — pass through as-is
  if (typeof value === "string" && /[£$€¥]/.test(value)) {
    return formatted;
  }

  return `${symbol}${formatted}`;
};
