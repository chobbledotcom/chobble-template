// Hire calculator for quote checkout
// Calculates running total based on hire dates and cart items

import { formatPrice, getCart } from "#assets/cart-utils.js";
import Config from "#assets/config.js";
import { onReady } from "#assets/on-ready.js";

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
const getPriceForDays = (item, days) => {
  const hirePrices = item.hire_prices;
  if (!hirePrices) return null;
  const price = hirePrices[days];
  return price ? parsePrice(price) * item.quantity : null;
};

// Calculate total hire cost for all cart items
// Returns { total, canCalculate } - canCalculate is false if any item lacks price for day count
const calculateHireTotal = (cart, days) => {
  if (days <= 0 || cart.length === 0) return { total: 0, canCalculate: false };

  let total = 0;
  for (const item of cart) {
    const itemPrice = getPriceForDays(item, days);
    if (itemPrice === null) {
      return { total: 0, canCalculate: false };
    }
    total += itemPrice;
  }
  return { total, canCalculate: true };
};

// Set minimum date to today
const setMinDate = (input) => {
  const today = new Date().toISOString().split("T")[0];
  input.min = today;
};

// Handle date change events
const handleDateChange = (elements) => () => {
  const { startInput, endInput, totalEl, daysInput } = elements;

  const startDate = startInput.value;
  const endDate = endInput.value;

  if (!startDate || !endDate) {
    totalEl.style.display = "none";
    daysInput.value = "";
    return;
  }

  const days = calculateDays(startDate, endDate);
  const cart = getCart();
  const { total, canCalculate } = calculateHireTotal(cart, days);

  daysInput.value = days;
  totalEl.style.display = "block";

  if (canCalculate) {
    totalEl.textContent = `Estimated total for ${days} day${days === 1 ? "" : "s"}: ${formatPrice(total)}`;
  } else {
    totalEl.textContent = `We'll provide an exact quote for your ${days} day hire.`;
  }
};

// Initialize hire calculator
const initHireCalculator = () => {
  if (Config.product_mode !== "hire") return;

  const startInput = document.getElementById("hire_start_date");
  const endInput = document.getElementById("hire_end_date");
  const totalEl = document.getElementById("hire-total");
  const daysInput = document.getElementById("hire_days");

  if (!startInput || !endInput || !totalEl) return;

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

onReady(initHireCalculator);
