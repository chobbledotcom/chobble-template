// Quote page cart display
// Shows cart items with quantity controls and remove buttons

import {
  attachQuantityHandlers,
  attachRemoveHandlers,
  escapeHtml,
  formatPrice,
  getCart,
  renderQuantityControls,
  updateCartIcon,
  updateItemQuantity,
} from "./cart-utils.js";
import { onReady } from "./on-ready.js";

function handleQuantityUpdate(itemName, quantity) {
  updateItemQuantity(itemName, quantity);
  renderCart();
  updateCartIcon();
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

    itemsEl.innerHTML = cart
      .map(
        (item) => `
        <div class="quote-cart-item" data-name="${escapeHtml(item.item_name)}">
          <div class="quote-cart-item-info">
            <span class="quote-cart-item-name">${escapeHtml(item.item_name)}</span>
            <span class="quote-cart-item-price">${formatPrice(item.unit_price)}</span>
          </div>
          <div class="quote-cart-item-controls">
            ${renderQuantityControls(item)}
            <button class="quote-cart-item-remove" data-name="${escapeHtml(item.item_name)}">Remove</button>
          </div>
        </div>
      `,
      )
      .join("");

    // Attach handlers using shared utilities
    attachQuantityHandlers(itemsEl, handleQuantityUpdate);
    attachRemoveHandlers(itemsEl, ".quote-cart-item-remove", () => {
      renderCart();
      updateCartIcon();
    });
  }
}

onReady(renderCart);
