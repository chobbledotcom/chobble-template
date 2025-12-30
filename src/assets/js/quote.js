// Quote page cart display
// Shows cart items with remove buttons (no quantity adjustment)

import {
  escapeHtml,
  formatPrice,
  getCart,
  removeItem,
  updateCartIcon,
} from "./cart-utils.js";
import { onReady } from "./on-ready.js";

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
      .map((item) => {
        const specsHtml =
          item.specs && item.specs.length > 0
            ? `<p class="quote-cart-item-specs">${item.specs.map((s) => `${escapeHtml(s.name)}: ${escapeHtml(s.value)}`).join(", ")}</p>`
            : "";
        return `
        <div class="quote-cart-item" data-name="${escapeHtml(item.item_name)}">
          <div class="quote-cart-item-info">
            <span class="quote-cart-item-name">${escapeHtml(item.item_name)}</span>
            <span class="quote-cart-item-price">${formatPrice(item.unit_price)}</span>
          </div>
          ${specsHtml}
          <button class="quote-cart-item-remove" data-name="${escapeHtml(item.item_name)}">Remove</button>
        </div>
      `;
      })
      .join("");

    // Attach remove handlers
    itemsEl.querySelectorAll(".quote-cart-item-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        removeItem(btn.dataset.name);
        renderCart();
        updateCartIcon();
      });
    });
  }
}

onReady(renderCart);
