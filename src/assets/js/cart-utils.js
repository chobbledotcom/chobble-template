// Shared cart utilities
// Common functions used across cart, quote, and checkout pages

export const STORAGE_KEY = "shopping_cart";

export function getCart() {
  try {
    const cart = localStorage.getItem(STORAGE_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch (e) {
    return [];
  }
}

export function saveCart(cart) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error("Error saving cart:", e);
  }
}

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function formatPrice(price) {
  return "£" + price.toFixed(2);
}

export function removeItem(itemName) {
  let cart = getCart();
  cart = cart.filter((item) => item.item_name !== itemName);
  saveCart(cart);
  return cart;
}

export function getItemCount() {
  const cart = getCart();
  return cart.reduce((count, item) => count + item.quantity, 0);
}

export function updateCartIcon() {
  const count = getItemCount();
  document.querySelectorAll(".cart-icon").forEach((icon) => {
    icon.style.display = count > 0 ? "flex" : "none";
    const badge = icon.querySelector(".cart-count");
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "block" : "none";
    }
  });
}
