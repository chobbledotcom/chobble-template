// Hire calculator for quote checkout
// Manages date inputs and notifies when hire days change

import { getCart } from "#public/utils/cart-utils.js";
import { filter } from "#utils/array-utils.js";

// Predicates
const isHireItem = (item) => item.product_mode === "hire";
const hasHireItems = (cart) => cart.some(isHireItem);
const getHireItems = filter(isHireItem);

// Calculate number of days between two dates (inclusive)
const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 0;
};

// Set minimum date to today
const setMinDate = (input) => {
  const today = new Date().toISOString().split("T")[0];
  input.min = today;
};

// Check if both dates are valid
const areDatesValid = (startValue, endValue) => Boolean(startValue && endValue);

// Update days input and notify callback
const notifyDaysChange = (daysInput, onDaysChange, days) => {
  if (daysInput) daysInput.value = days;
  onDaysChange(days);
};

// Sync end date min constraint with start date
const syncEndDateConstraint = (startInput, endInput) => {
  endInput.min = startInput.value;
  if (endInput.value && endInput.value < startInput.value) {
    endInput.value = startInput.value;
  }
};

// Initialize hire calculator
// Sets up date inputs and calls onDaysChange when dates are selected
const initHireCalculator = (onDaysChange) => {
  const startInput = document.querySelector('input[name="start_date"]');
  const endInput = document.querySelector('input[name="end_date"]');

  if (startInput === null || !hasHireItems(getCart())) return;

  const daysInput = document.getElementById("hire_days");

  setMinDate(startInput);
  setMinDate(endInput);

  const handleChange = () => {
    if (!areDatesValid(startInput.value, endInput.value)) {
      if (daysInput) daysInput.value = "";
      onDaysChange(1);
      return;
    }
    const days = calculateDays(startInput.value, endInput.value);
    notifyDaysChange(daysInput, onDaysChange, days);
  };

  startInput.addEventListener("change", () => {
    if (startInput.value) syncEndDateConstraint(startInput, endInput);
    handleChange();
  });

  endInput.addEventListener("change", handleChange);
};

export {
  calculateDays,
  getHireItems,
  hasHireItems,
  initHireCalculator,
  isHireItem,
  setMinDate,
};
