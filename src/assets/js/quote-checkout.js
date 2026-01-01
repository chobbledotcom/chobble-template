// Quote checkout page
// Populates form with cart items and displays summary

import { formatPrice, getCart } from "#assets/cart-utils.js";
import { onReady } from "#assets/on-ready.js";
import {
  QUOTE_CHECKOUT_ITEM_SELECTORS,
  TEMPLATE_IDS,
} from "#assets/selectors.js";
import { getTemplate } from "#assets/template.js";

function renderCheckoutItem(item) {
  const template = getTemplate(TEMPLATE_IDS.QUOTE_CHECKOUT_ITEM);

  template.querySelector(QUOTE_CHECKOUT_ITEM_SELECTORS.NAME).textContent =
    item.item_name;
  template.querySelector(QUOTE_CHECKOUT_ITEM_SELECTORS.QTY).textContent =
    `x${item.quantity}`;
  template.querySelector(QUOTE_CHECKOUT_ITEM_SELECTORS.PRICE).textContent =
    formatPrice(item.unit_price * item.quantity);

  return template;
}

function populateForm() {
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
}

onReady(populateForm);
