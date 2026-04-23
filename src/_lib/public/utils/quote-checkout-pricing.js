// Quote checkout pricing helpers
// Shared helpers for rendering day-aware checkout prices and text summaries

import { formatPrice } from "#public/utils/cart-utils.js";
import { getPriceForDays, sanitizeItemName } from "#public/utils/quote-pricing.js";

const getDisplayPrice = (item, days) => {
  const price = getPriceForDays(days)(item);
  return price === null ? "TBC" : formatPrice(price);
};

const getUnitDisplayPrice = (item, days) =>
  getDisplayPrice({ ...item, quantity: 1 }, days);

const buildCartText = (item, days) =>
  `${sanitizeItemName(item)} x${item.quantity} @ ${getUnitDisplayPrice(item, days)} = ${getDisplayPrice(item, days)}`;

export { buildCartText, getDisplayPrice, sanitizeItemName };
