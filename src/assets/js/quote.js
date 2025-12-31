// Quote page cart display
// Shows cart items with quantity controls and remove buttons

import {
  attachQuantityHandlers,
  attachRemoveHandlers,
  formatPrice,
  getCart,
  updateCartIcon,
  updateItemQuantity,
} from "#assets/cart-utils.js";
import { onReady } from "#assets/on-ready.js";
import { getTemplate, populateQuantityControls } from "#assets/template.js";

function handleQuantityUpdate(itemName, quantity) {
  updateItemQuantity(itemName, quantity);
  renderCart();
  updateCartIcon();
}

function renderQuoteItem(item) {
  const template = getTemplate("quote-cart-item-template");

  template.querySelector(".quote-cart-item").dataset.name = item.item_name;
  template.querySelector(".quote-cart-item-name").textContent = item.item_name;
  template.querySelector(".quote-cart-item-price").textContent = formatPrice(
    item.unit_price,
  );

  const specsEl = template.querySelector(".quote-cart-item-specs");
  if (item.specs && item.specs.length > 0) {
    specsEl.textContent = item.specs
      .map((s) => `${s.name}: ${s.value}`)
      .join(", ");
  } else {
    specsEl.remove();
  }

  populateQuantityControls(template, item);

  return template;
}

function renderCart() {
  const cart = getCart();
  const container = document.getElementById("quote-cart");
  if (!container) return;

  const itemsEl = container.querySelector(".quote-cart-items");
  const emptyEl = container.querySelector(".quote-cart-empty");
  const actionsEl = container.querySelector(".quote-cart-actions");

  if (cart.length === 0) {
    emptyEl.style.display = "block";
    itemsEl.innerHTML = "";
    actionsEl.style.display = "none";
  } else {
    emptyEl.style.display = "none";
    actionsEl.style.display = "block";

    itemsEl.innerHTML = "";
    for (const item of cart) {
      itemsEl.appendChild(renderQuoteItem(item));
    }

    attachQuantityHandlers(itemsEl, handleQuantityUpdate);
    attachRemoveHandlers(itemsEl, ".quote-cart-item-remove", () => {
      renderCart();
      updateCartIcon();
    });
  }
}

onReady(renderCart);
