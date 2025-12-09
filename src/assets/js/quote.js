// Quote page cart display
// Shows cart items with remove buttons (no quantity adjustment)

(function () {
  const storageKey = "shopping_cart";

  function getCart() {
    try {
      const cart = localStorage.getItem(storageKey);
      return cart ? JSON.parse(cart) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch (e) {
      console.error("Error saving cart:", e);
    }
  }

  function removeItem(itemName) {
    let cart = getCart();
    cart = cart.filter((item) => item.item_name !== itemName);
    saveCart(cart);
    renderCart();
    updateCartIcon();
  }

  function updateCartIcon() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartIcon = document.getElementById("cart-icon");
    if (cartIcon) {
      const badge = cartIcon.querySelector(".cart-count");
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? "block" : "none";
      }
      cartIcon.style.display = count > 0 ? "flex" : "none";
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function formatPrice(price) {
    return "£" + price.toFixed(2);
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
          <button class="quote-cart-item-remove btn" data-name="${escapeHtml(item.item_name)}">Remove</button>
        </div>
      `,
        )
        .join("");

      // Attach remove handlers
      itemsEl.querySelectorAll(".quote-cart-item-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          removeItem(btn.dataset.name);
        });
      });
    }
  }

  // Initial render
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderCart);
  } else {
    renderCart();
  }
})();
