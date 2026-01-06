// Quote checkout page
// Populates form with cart items and displays summary

import { initHireCalculator } from "#public/cart/hire-calculator.js";
import { formatPrice, getCart } from "#public/utils/cart-utils.js";
import { onReady } from "#public/utils/on-ready.js";
import { updateQuotePrice } from "#public/utils/quote-price-utils.js";
import { IDS } from "#public/utils/selectors.js";
import { getTemplate } from "#public/utils/template.js";

const renderCheckoutItem = (item) => {
  const template = getTemplate(IDS.QUOTE_CHECKOUT_ITEM, document);

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
