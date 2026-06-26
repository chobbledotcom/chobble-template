// Quote pricing helpers
// Shared day-aware pricing and name formatting for quote flows

import { isHireItem } from "#public/cart/hire-calculator.js";
import { parsePrice } from "#utils/price-utils.js";

const HIRE_DAY_SUFFIX = /\s-\s\d+\sday(?:s)?$/i;

// Returns null if hire item lacks price for that day count
const getPriceForDays = (days) => (item) => {
  if (!isHireItem(item)) {
    return item.unit_price * item.quantity;
  }
  const price = item.hire_prices[days];
  return price ? parsePrice(0)(price) * item.quantity : null;
};

const sanitizeItemName = (item) =>
  isHireItem(item)
    ? item.item_name.replace(HIRE_DAY_SUFFIX, "")
    : item.item_name;

export { getPriceForDays, sanitizeItemName };
