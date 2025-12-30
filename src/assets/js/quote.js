// Quote page cart display
// Shows cart items with quantity controls and remove buttons

import {
  escapeHtml,
  formatPrice,
  getCart,
  removeItem,
  saveCart,
  updateCartIcon,
} from "./cart-utils.js";
import { onReady } from "./on-ready.js";

function updateQuantity(itemName, quantity) {
  const cart = getCart();
  const item = cart.find((i) => i.item_name === itemName);

  if (item) {
    if (quantity <= 0) {
      removeItem(itemName);
    } else {
      // Check max_quantity constraint
      if (item.max_quantity && quantity > item.max_quantity) {
        alert(`The maximum quantity for this item is ${item.max_quantity}`);
        item.quantity = item.max_quantity;
      } else {
        item.quantity = quantity;
      }
      saveCart(cart);
    }
    renderCart();
    updateCartIcon();
  }
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
            <div class="quote-cart-item-quantity">
              <button class="qty-btn qty-decrease" data-name="${escapeHtml(item.item_name)}">−</button>
              <input type="number" class="qty-input" value="${item.quantity}" min="1"
                     ${item.max_quantity ? `max="${item.max_quantity}"` : ""}
                     data-name="${escapeHtml(item.item_name)}">
              <button class="qty-btn qty-increase" data-name="${escapeHtml(item.item_name)}">+</button>
            </div>
            <button class="quote-cart-item-remove" data-name="${escapeHtml(item.item_name)}">Remove</button>
          </div>
        </div>
      `,
      )
      .join("");

    // Attach quantity button handlers
    const addQtyHandler = (selector, delta) => {
      itemsEl.querySelectorAll(selector).forEach((btn) => {
        btn.addEventListener("click", () => {
          const itemName = btn.dataset.name;
          const item = cart.find((i) => i.item_name === itemName);
          if (item) {
            updateQuantity(itemName, item.quantity + delta);
          }
        });
      });
    };
    addQtyHandler(".qty-decrease", -1);
    addQtyHandler(".qty-increase", 1);

    // Attach quantity input handlers
    itemsEl.querySelectorAll(".qty-input").forEach((input) => {
      input.addEventListener("change", () => {
        const itemName = input.dataset.name;
        const quantity = parseInt(input.value);
        if (!isNaN(quantity)) {
          updateQuantity(itemName, quantity);
        }
      });
    });

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
