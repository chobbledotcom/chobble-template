// Quote price display utilities
// Renders a price summary for cart items with hire pricing

import { formatPrice, getCart } from "#assets/cart-utils.js";
import { IDS } from "#assets/selectors.js";
import { getTemplate } from "#assets/template.js";
import { map, reduce } from "#utils/array-utils.js";

// Predicates
const isHireItem = (item) => item.product_mode === "hire";

// Parse a price string, extracting numeric value
const parsePrice = (priceStr) => {
  if (typeof priceStr === "number") return priceStr;
  if (!priceStr) return 0;
  const matches = String(priceStr).match(/[\d.]+/);
  return matches ? Number.parseFloat(matches[0]) : 0;
};

// Sum an array of numbers
const sum = reduce((acc, n) => acc + n, 0);

// Get price for an item for a specific number of days
// Returns null if hire item lacks price for that day count
const getPriceForDays = (days) => (item) => {
  if (!isHireItem(item)) {
    return item.unit_price * item.quantity;
  }
  const price = item.hire_prices[days];
  return price ? parsePrice(price) * item.quantity : null;
};

// Format item display name with quantity
const formatItemName = (item) =>
  item.quantity > 1 ? `${item.item_name} (×${item.quantity})` : item.item_name;

// Format price for display, handling null values
const formatItemPrice = (price) =>
  price === null ? "TBC" : formatPrice(price);

// Calculate total for all items
const calculateTotal = (cart, days) => {
  const prices = map(getPriceForDays(days))(cart);
  if (prices.includes(null)) {
    return { total: 0, canCalculate: false };
  }
  return { total: sum(prices), canCalculate: true };
};

// Format hire length display
const formatHireLength = (days) => (days === 1 ? "1 day" : `${days} days`);

// Format item count display
const formatItemCount = (count) =>
  count === 1 ? "1 item in order" : `${count} items in order`;

// Count total items including quantities
const countItems = (cart) => sum(map((item) => item.quantity)(cart));

// Create an item element from template
const createItemElement = (item, days) => {
  const template = getTemplate(IDS.QUOTE_PRICE_ITEM);
  const price = getPriceForDays(days)(item);
  template.querySelector('[data-field="name"]').textContent =
    formatItemName(item);
  template.querySelector('[data-field="price"]').textContent =
    formatItemPrice(price);
  return template;
};

// Populate the items list
const populateItems = (container, cart, days) => {
  container.innerHTML = "";
  for (const item of cart) {
    container.appendChild(createItemElement(item, days));
  }
};

// Render the quote price display
const renderQuotePrice = (container, days = 1) => {
  const cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  const template = getTemplate(IDS.QUOTE_PRICE);
  const { total, canCalculate } = calculateTotal(cart, days);
  const itemCount = countItems(cart);

  template.querySelector('[data-field="item-count"]').textContent =
    formatItemCount(itemCount);
  template.querySelector('[data-field="hire-length"]').textContent =
    formatHireLength(days);
  template.querySelector('[data-field="total"]').textContent = canCalculate
    ? formatPrice(total)
    : "TBC";

  const itemsContainer = template.querySelector('[data-field="items"]');
  populateItems(itemsContainer, cart, days);

  container.innerHTML = "";
  container.appendChild(template);
  container.style.display = "block";
};

// Initialize quote price display
const initQuotePrice = (initialDays = 1) => {
  const container = document.getElementById("quote-price-container");
  if (!container) return null;

  renderQuotePrice(container, initialDays);

  return {
    update: (days) => renderQuotePrice(container, days),
    container,
  };
};

export {
  calculateTotal,
  countItems,
  formatHireLength,
  formatItemCount,
  formatItemName,
  formatItemPrice,
  getPriceForDays,
  initQuotePrice,
  parsePrice,
};
