// Quote checkout page
// Populates form with cart items and displays summary

import {
  calculateDays,
  initHireCalculator,
} from "#public/cart/hire-calculator.js";
import { getCart } from "#public/utils/cart-utils.js";
import { onReady } from "#public/utils/on-ready.js";
import {
  setupDetailsBlurHandlers,
  updateQuotePrice,
} from "#public/utils/quote-price-utils.js";
import {
  buildCartText,
  getDisplayPrice,
  sanitizeItemName,
} from "#public/utils/quote-checkout-pricing.js";
import { IDS } from "#public/utils/selectors.js";
import { getTemplate } from "#public/utils/template.js";

const renderCheckoutItem = (item, days) => {
  const template = getTemplate(IDS.QUOTE_CHECKOUT_ITEM, document);

  template.querySelector('[data-field="name"]').textContent =
    sanitizeItemName(item);
  template.querySelector('[data-field="qty"]').textContent =
    `x${item.quantity}`;
  template.querySelector('[data-field="price"]').textContent = getDisplayPrice(
    item,
    days,
  );

  return template;
};

const populateForm = (days) => {
  const cart = getCart();
  const cartItemsField = document.getElementById("cart-items");
  const summaryEl = document.getElementById("cart-summary");

  if (!cartItemsField || !summaryEl) return;

  const itemsEl = summaryEl.querySelector(".quote-checkout-items");

  if (cart.length === 0) {
    window.location.href = "/quote/";
    return;
  }

  // Build text representation for the hidden field
  const cartText = cart.map((item) => buildCartText(item, days)).join("\n");

  cartItemsField.value = cartText;

  // Build visual summary
  itemsEl.replaceChildren(
    ...cart.map((item) => renderCheckoutItem(item, days)),
  );
};

// Calculate days from date inputs (returns 1 if dates not set)
const getDays = () => {
  const start = document.querySelector('input[name="start_date"]')?.value;
  const end = document.querySelector('input[name="end_date"]')?.value;
  return start && end ? calculateDays(start, end) : 1;
};

const init = () => {
  const updateSummary = (days) => {
    populateForm(days);
    updateQuotePrice(days);
  };
  updateSummary(getDays());
  initHireCalculator(updateSummary);
  setupDetailsBlurHandlers(getDays);
};

onReady(init);
