// Quote checkout page
// Populates form with cart items and displays summary

import {
  calculateDays,
  initHireCalculator,
} from "#public/cart/hire-calculator.js";
import { formatPrice, getCart } from "#public/utils/cart-utils.js";
import Config from "#public/utils/config.js";
import { onReady } from "#public/utils/on-ready.js";
import {
  buildCartText,
  getDisplayPrice,
  sanitizeItemName,
} from "#public/utils/quote-checkout-pricing.js";
import {
  collectFieldDetails,
  getFormContainer,
  setupDetailsBlurHandlers,
  updateQuotePrice,
} from "#public/utils/quote-price-utils.js";
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

const buildAnswerPricesText = () => {
  const details = collectFieldDetails(getFormContainer());
  const priced = details.filter((d) => d.price !== null);
  if (priced.length === 0) return "";
  return (
    "\n" +
    priced
      .map((d) => `${d.key}: ${d.value} (+${formatPrice(d.price)})`)
      .join("\n")
  );
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
  cartItemsField.value = cartText + buildAnswerPricesText();

  // Build visual summary
  itemsEl.replaceChildren(
    ...cart.map((item) => renderCheckoutItem(item, days)),
  );
};

// Calculate days from date inputs (returns 1 if dates not set or not hire mode)
const getDays = () => {
  if (Config.quote_type !== "hire") return 1;
  const start = document.querySelector('input[name="start_date"]')?.value;
  const end = document.querySelector('input[name="end_date"]')?.value;
  return start && end ? calculateDays(start, end) : 1;
};

const init = () => {
  const updateQuoteSummary = (days) => {
    populateForm(days);
    updateQuotePrice(days);
  };
  updateQuoteSummary(getDays());
  if (Config.quote_type === "hire") {
    initHireCalculator(updateQuoteSummary);
  }
  setupDetailsBlurHandlers(getDays, populateForm);
};

onReady(init);
