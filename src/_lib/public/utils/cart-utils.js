// Shared cart utilities
// Common functions used across cart, quote, and checkout pages

import { showNotification } from "#public/utils/notify.js";
import { formatPrice as formatCurrency } from "#utils/format-price.js";

const STORAGE_KEY = "shopping_cart";

export function getCart() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

const getCurrency = () =>
  JSON.parse(document.getElementById("site-config").textContent).currency;

export function formatPrice(price) {
  return formatCurrency(getCurrency(), price);
}

const removeItem = (itemName) => {
  const cart = getCart().filter((item) => item.item_name !== itemName);
  saveCart(cart);
  return cart;
};

const getItemCount = () => {
  const cart = getCart();
  return cart.reduce((count, item) => count + item.quantity, 0);
};

export function getCheckoutItems() {
  return getCart().map(({ sku, quantity }) => ({ sku, quantity }));
}

// Update a single cart icon's visibility based on count
const updateSingleCartIcon = (icon, count) => {
  const alwaysShow = icon.classList.contains("always-show");
  icon.style.display = count > 0 || alwaysShow ? "flex" : "none";
  const badge = icon.querySelector(".cart-count");
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? "block" : "none";
};

export function updateCartIcon() {
  const count = getItemCount();
  for (const icon of document.querySelectorAll(".cart-icon")) {
    updateSingleCartIcon(icon, count);
  }
}

export function clearCart({ hideIcons = false } = {}) {
  localStorage.removeItem(STORAGE_KEY);

  if (hideIcons) {
    for (const icon of document.querySelectorAll(".cart-icon")) {
      icon.style.display = "none";
    }
    return;
  }

  updateCartIcon();
}

export const clampQuantity = (quantity, maxQuantity) => {
  if (!maxQuantity || quantity <= maxQuantity) return quantity;
  showNotification(`The maximum quantity for this item is ${maxQuantity}`);
  return maxQuantity;
};

export function updateItemQuantity(itemName, quantity) {
  const cart = getCart();
  const item = cart.find((i) => i.item_name === itemName);
  if (!item) return false;

  if (quantity <= 0) {
    removeItem(itemName);
  } else {
    item.quantity = clampQuantity(quantity, item.max_quantity);
    saveCart(cart);
  }
  return true;
}

function forEachClick(selector, handler) {
  for (const el of document.querySelectorAll(selector)) {
    el.addEventListener("click", () => handler(el));
  }
}

export function attachQuantityHandlers(onUpdate) {
  const cart = getCart();

  const handleQtyClick = (delta) => (btn) => {
    const item = cart.find((i) => i.item_name === btn.dataset.name);
    if (item) {
      onUpdate(btn.dataset.name, item.quantity + delta);
    }
  };

  forEachClick(".quantity-decrease[data-name]", handleQtyClick(-1));
  forEachClick(".quantity-increase[data-name]", handleQtyClick(1));

  for (const input of document.querySelectorAll(".quantity-input[data-name]")) {
    input.addEventListener("change", () => {
      const quantity = Number.parseInt(input.value, 10);
      if (!Number.isNaN(quantity)) {
        onUpdate(input.dataset.name, quantity);
      }
    });
  }
}

export function attachRemoveHandlers(onRemove) {
  forEachClick('[data-action="remove"]', (btn) => {
    removeItem(btn.dataset.name);
    onRemove();
  });
}
