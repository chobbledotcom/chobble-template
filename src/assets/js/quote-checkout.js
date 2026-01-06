// Quote checkout page
// Populates form with cart items and displays summary

import { formatPrice, getCart } from "#assets/cart-utils.js";
import { initHireCalculator } from "#assets/hire-calculator.js";
import { onReady } from "#assets/on-ready.js";
import { updateQuotePrice } from "#assets/quote-price-utils.js";
import { IDS } from "#assets/selectors.js";
import { getTemplate } from "#assets/template.js";

const renderCheckoutItem = (item) => {
  const template = getTemplate(IDS.QUOTE_CHECKOUT_ITEM);

  template.querySelector('[data-field="name"]').textContent = item.item_name;
  template.querySelector('[data-field="qty"]').textContent =
    `x${item.quantity}`;
  template.querySelector('[data-field="price"]').textContent = formatPrice(
    item.unit_price * item.quantity,
  );

  return template;
};

const populateForm = () => {
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
  const cartText = cart
    .map(
      (item) =>
        `${item.item_name} x${item.quantity} @ ${formatPrice(item.unit_price)} = ${formatPrice(item.unit_price * item.quantity)}`,
    )
    .join("\n");

  cartItemsField.value = cartText;

  // Build visual summary
  itemsEl.innerHTML = "";
  for (const item of cart) {
    itemsEl.appendChild(renderCheckoutItem(item));
  }
};

const init = () => {
  populateForm();
  updateQuotePrice();
  initHireCalculator(updateQuotePrice);
};

onReady(init);
