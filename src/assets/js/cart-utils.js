// Shared cart utilities
// Common functions used across cart, quote, and checkout pages

export const STORAGE_KEY = "shopping_cart";

export function getCart() {
  const cart = localStorage.getItem(STORAGE_KEY);
  if (!cart) {
    return [];
  }
  try {
    return JSON.parse(cart);
  } catch (e) {
    console.error("[cart-utils] Failed to parse cart:", e.message);
    return [];
  }
}

export function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
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
  const cart = getCart().filter((item) => item.item_name !== itemName);
  saveCart(cart);
  return cart;
}

export function getItemCount() {
  const cart = getCart();
  return cart.reduce((count, item) => count + item.quantity, 0);
}

export function updateCartIcon() {
  const count = getItemCount();
  const icons = document.querySelectorAll(".cart-icon");
  icons.forEach((icon) => {
    icon.style.display = count > 0 ? "flex" : "none";
    const badge = icon.querySelector(".cart-count");
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "block" : "none";
    }
  });
}

export function updateItemQuantity(itemName, quantity) {
  const cart = getCart();
  const item = cart.find((i) => i.item_name === itemName);

  if (!item) return false;

  if (quantity <= 0) {
    removeItem(itemName);
  } else {
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

export function renderQuantityControls(item) {
  return `
    <div class="cart-item-quantity">
      <button class="qty-btn qty-decrease" data-name="${escapeHtml(item.item_name)}">−</button>
      <input type="number" class="qty-input" value="${item.quantity}" min="1"
             ${item.max_quantity ? `max="${item.max_quantity}"` : ""}
             data-name="${escapeHtml(item.item_name)}">
      <button class="qty-btn qty-increase" data-name="${escapeHtml(item.item_name)}">+</button>
    </div>`;
}

export function attachQuantityHandlers(container, onUpdate) {
  const cart = getCart();

  const addQtyHandler = (selector, delta) => {
    container.querySelectorAll(selector).forEach((btn) => {
      btn.addEventListener("click", () => {
        const itemName = btn.dataset.name;
        const item = cart.find((i) => i.item_name === itemName);
        if (item) {
          onUpdate(itemName, item.quantity + delta);
        }
      });
    });
  };
  addQtyHandler(".qty-decrease", -1);
  addQtyHandler(".qty-increase", 1);

  container.querySelectorAll(".qty-input").forEach((input) => {
    input.addEventListener("change", () => {
      const itemName = input.dataset.name;
      const quantity = parseInt(input.value);
      if (!isNaN(quantity)) {
        onUpdate(itemName, quantity);
      }
    });
  });
}

export function attachRemoveHandlers(container, selector, onRemove) {
  container.querySelectorAll(selector).forEach((btn) => {
    btn.addEventListener("click", () => {
      removeItem(btn.dataset.name);
      onRemove();
    });
  });
}
