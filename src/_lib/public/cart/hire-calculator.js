// Hire calculator for quote checkout
// Shows date fields if any cart item is hire mode
// Calculates running total based on hire dates and cart items

import { formatPrice, getCart } from "#public/utils/cart-utils.js";
import { onReady } from "#public/utils/on-ready.js";
import { filter, map, reduce } from "#utils/array-utils.js";

// Predicates
const isHireItem = (item) => item.product_mode === "hire";

// Check if any cart item is a hire item
const hasHireItems = (cart) => cart.some(isHireItem);

// Get only hire items from cart
const getHireItems = filter(isHireItem);

// Parse a price string, extracting numeric value
// Handles formats like "£50", "from £50", "£50.00", "50", etc.
const parsePrice = (priceStr) => {
  if (typeof priceStr === "number") return priceStr;
  if (!priceStr) return 0;
  const matches = String(priceStr).match(/[\d.]+/);
  return matches ? Number.parseFloat(matches[0]) : 0;
};

// Calculate number of days between two dates (inclusive)
const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 0;
};

// Get price for an item for a specific number of days
// Returns null if no price exists for that day count
const getPriceForDays = (days) => (item) => {
  const hirePrices = item.hire_prices;
  if (!hirePrices) return null;
  const price = hirePrices[days];
  return price ? parsePrice(price) * item.quantity : null;
};

// Sum an array of numbers
const sum = reduce((acc, n) => acc + n, 0);

// Calculate total hire cost for hire items only
// Returns { total, canCalculate } - canCalculate is false if any hire item lacks price
const calculateHireTotal = (cart, days) => {
  const hireItems = getHireItems(cart);

  if (days <= 0 || hireItems.length === 0) {
    return { total: 0, canCalculate: false };
  }

  const prices = map(getPriceForDays(days))(hireItems);

  if (prices.includes(null)) {
    return { total: 0, canCalculate: false };
  }

  return { total: sum(prices), canCalculate: true };
};

// Set minimum date to today
const setMinDate = (input) => {
  const today = new Date().toISOString().split("T")[0];
  input.min = today;
};

// Format hire total message based on calculation result
const formatHireMessage = (days, total, canCalculate) => {
  const dayLabel = days === 1 ? "day" : "days";
  if (canCalculate) {
    return `Estimated total for ${days} ${dayLabel}: ${formatPrice(total)}`;
  }
  return `We'll provide an exact quote for your ${days} day hire.`;
};

// Handle date change events
const handleDateChange = (elements) => () => {
  const { startInput, endInput, totalEl, daysInput } = elements;

  if (!startInput.value || !endInput.value) {
    totalEl.style.display = "none";
    daysInput.value = "";
    return;
  }

  const days = calculateDays(startInput.value, endInput.value);
  const { total, canCalculate } = calculateHireTotal(getCart(), days);

  daysInput.value = days;
  totalEl.style.display = "block";
  totalEl.textContent = formatHireMessage(days, total, canCalculate);
};

// Initialize hire calculator
// Looks for fields named start_date and end_date in the form
const initHireCalculator = () => {
  const startInput = document.querySelector('input[name="start_date"]');
  const endInput = document.querySelector('input[name="end_date"]');
  const totalEl = document.getElementById("hire-total");
  const daysInput = document.getElementById("hire_days");

  if (!startInput || !endInput || !totalEl) return;

  const cart = getCart();
  if (!hasHireItems(cart)) return;

  const elements = { startInput, endInput, totalEl, daysInput };

  setMinDate(startInput);
  setMinDate(endInput);

  startInput.addEventListener("change", () => {
    if (startInput.value) {
      endInput.min = startInput.value;
      if (endInput.value && endInput.value < startInput.value) {
        endInput.value = startInput.value;
      }
    }
    handleDateChange(elements)();
  });

  endInput.addEventListener("change", handleDateChange(elements));
};

// Only initialize in browser environment
if (typeof document !== "undefined") {
  onReady(initHireCalculator);
}

export {
  calculateDays,
  calculateHireTotal,
  formatHireMessage,
  getHireItems,
  handleDateChange,
  hasHireItems,
  initHireCalculator,
  isHireItem,
  parsePrice,
  setMinDate,
};
