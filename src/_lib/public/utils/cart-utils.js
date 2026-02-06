// Shared cart utilities
// Common functions used across cart, quote, and checkout pages

import { error as logError } from "#utils/console.js";
import { formatPrice as formatCurrency } from "#utils/format-price.js";

export const STORAGE_KEY = "shopping_cart";

/**
 * Safely parse JSON from localStorage, returning null on corrupt data.
 * localStorage is browser-side storage that users/extensions can corrupt.
 */
export function safeGetStorageJson(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    logError(`Failed to parse localStorage key "${key}":`, e);
    return null;
  }
}

export function getCart() {
  const data = safeGetStorageJson(STORAGE_KEY);
  if (data) return data;
  return [];
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

export function updateItemQuantity(itemName, quantity) {
  const cart = getCart();
  const item = cart.find((i) => i.item_name === itemName);
  if (!item) return false;

  if (quantity <= 0) {
    removeItem(itemName);
  } else {
    // Clamp quantity to item's max_quantity if set
    if (item.max_quantity && quantity > item.max_quantity) {
      alert(`The maximum quantity for this item is ${item.max_quantity}`);
      item.quantity = item.max_quantity;
    } else {
      item.quantity = quantity;
    }
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
