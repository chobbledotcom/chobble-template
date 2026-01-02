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

// Get the daily rate for an item based on quantity
// Uses unit_price as the base daily rate
const getDailyRate = (item) => parsePrice(item.unit_price) * item.quantity;

// Calculate total hire cost for all cart items
const calculateHireTotal = (cart, days) => {
  if (days <= 0) return 0;
  const dailyTotal = cart.reduce((sum, item) => sum + getDailyRate(item), 0);
  return dailyTotal * days;
};

// Update the display and hidden fields
const updateTotal = (totalEl, amountEl, totalInput, daysInput, total, days) => {
  if (days > 0) {
    totalEl.style.display = "flex";
    amountEl.textContent = formatPrice(total);
    totalInput.value = formatPrice(total);
    daysInput.value = days;
  } else {
    totalEl.style.display = "none";
    amountEl.textContent = "£0.00";
    totalInput.value = "";
    daysInput.value = "";
  }
};

// Handle date change events
const handleDateChange = (elements) => () => {
  const { startInput, endInput, totalEl, amountEl, totalInput, daysInput } =
    elements;

  const startDate = startInput.value;
  const endDate = endInput.value;

  if (!startDate || !endDate) {
    updateTotal(totalEl, amountEl, totalInput, daysInput, 0, 0);
    return;
  }

  const days = calculateDays(startDate, endDate);
  const cart = getCart();
  const total = calculateHireTotal(cart, days);

  updateTotal(totalEl, amountEl, totalInput, daysInput, total, days);
};

// Set minimum date to today
const setMinDate = (input) => {
  const today = new Date().toISOString().split("T")[0];
  input.min = today;
};

// Initialize hire calculator
const initHireCalculator = () => {
  if (Config.product_mode !== "hire") return;

  const startInput = document.getElementById("hire_start_date");
  const endInput = document.getElementById("hire_end_date");
  const totalEl = document.getElementById("hire-total");
  const amountEl = document.getElementById("hire-total-amount");
  const totalInput = document.getElementById("hire_total");
  const daysInput = document.getElementById("hire_days");

  if (!startInput || !endInput || !totalEl || !amountEl) return;

  const elements = {
    startInput,
    endInput,
    totalEl,
    amountEl,
    totalInput,
    daysInput,
  };

  // Set minimum dates
  setMinDate(startInput);
  setMinDate(endInput);

  // Update end date minimum when start date changes
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
