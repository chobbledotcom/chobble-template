// Hire calculator for quote checkout
// Manages date inputs and notifies when hire days change

import { getCart } from "#public/utils/cart-utils.js";
import { filter } from "#utils/array-utils.js";

const isHireItem = (item) => item.product_mode === "hire";
const hasHireItems = (cart) => cart.some(isHireItem);
const getHireItems = filter(isHireItem);

const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 0;
};

const setMinDate = (input) => {
  const today = new Date().toISOString().split("T")[0];
  input.min = today;
};

const areDatesValid = (startValue, endValue) => Boolean(startValue && endValue);

const notifyDaysChange = (daysInput, onDaysChange, days) => {
  if (daysInput) daysInput.value = days;
  onDaysChange(days);
};

const syncEndDateConstraint = (startInput, endInput) => {
  endInput.min = startInput.value;
  if (endInput.value && endInput.value < startInput.value) {
    endInput.value = startInput.value;
  }
};

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
