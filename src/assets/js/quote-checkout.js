// Quote checkout page
// Populates form with cart items and displays summary

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

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function formatPrice(price) {
    return "£" + price.toFixed(2);
  }

  function populateForm() {
    const cart = getCart();
    const cartItemsField = document.getElementById("cart-items");
    const summaryEl = document.getElementById("cart-summary");

    if (!cartItemsField || !summaryEl) return;

    const itemsEl = summaryEl.querySelector(".quote-checkout-items");

    if (cart.length === 0) {
      // Redirect back to quote page if cart is empty
      window.location.href = "/quote/";
      return;
    }

    // Build text representation for the hidden field
    const cartText = cart
      .map(
        (item) =>
          `${item.item_name} x${item.quantity} @ ${formatPrice(item.unit_price)} = ${formatPrice(item.unit_price * item.quantity)}`,
      )
      .join("\n");

    cartItemsField.value = cartText;

    // Build visual summary
    itemsEl.innerHTML = cart
      .map(
        (item) => `
        <div class="quote-checkout-item">
          <span class="quote-checkout-item-name">${escapeHtml(item.item_name)}</span>
          <span class="quote-checkout-item-qty">x${item.quantity}</span>
          <span class="quote-checkout-item-price">${formatPrice(item.unit_price * item.quantity)}</span>
        </div>
      `,
      )
      .join("");
  }

  // Initial population
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", populateForm);
  } else {
    populateForm();
  }
})();
