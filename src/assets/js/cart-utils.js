// Shared cart utilities
// Common functions used across cart, quote, and checkout pages

export const STORAGE_KEY = "shopping_cart";

export function getCart() {
  const cart = localStorage.getItem(STORAGE_KEY);
  console.log("[cart-utils.js] getCart() raw:", cart);
  if (!cart) {
    return [];
  }
  try {
    const parsed = JSON.parse(cart);
    console.log("[cart-utils.js] getCart() parsed:", parsed);
    return parsed;
  } catch (e) {
    console.warn("[cart-utils.js] getCart() parse error:", e.message);
    return [];
  }
}

export function saveCart(cart) {
  console.log("[cart-utils.js] saveCart() called with:", cart);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  console.log("[cart-utils.js] saveCart() complete");
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
  console.log("[cart-utils.js] updateCartIcon() count:", count);
  const icons = document.querySelectorAll(".cart-icon");
  console.log("[cart-utils.js] Found cart-icon elements:", icons.length);
  icons.forEach((icon, i) => {
    console.log(
      `[cart-utils.js] Cart icon ${i}: setting display to`,
      count > 0 ? "flex" : "none",
    );
    icon.style.display = count > 0 ? "flex" : "none";
    const badge = icon.querySelector(".cart-count");
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "block" : "none";
    }
  });
}
