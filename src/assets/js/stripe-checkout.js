// Stripe Checkout Page
// Handles the redirect flow: checks cart and redirects to Stripe or homepage

import { getCart } from "#assets/cart-utils.js";

function showError(message) {
  const statusMessage = document.getElementById("status-message");
  statusMessage.textContent = message;
  statusMessage.classList.add("error");
}

async function checkout() {
  const main = document.querySelector(".stripe-checkout-page");

  // Only run on stripe-checkout page
  if (!main) return;

  const statusMessage = document.getElementById("status-message");
  const checkoutApiUrl = main.dataset.checkoutApiUrl;

  const cart = getCart();

  // If cart is empty, redirect to homepage
  if (cart.length === 0) {
    statusMessage.textContent = "Redirecting to homepage...";
    window.location.href = "/";
    return;
  }

  // Check configuration
  if (!checkoutApiUrl) {
    showError("Checkout backend is not configured");
    return;
  }

  statusMessage.textContent = "Redirecting to Stripe...";

  // Prepare cart items (SKU + quantity only)
  const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));

  // Create Stripe session via backend
  const response = await fetch(checkoutApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  }).catch(() => null);

  if (!response) {
    showError("Failed to connect. Please check your internet and try again.");
    return;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    showError(error.error || "Failed to create checkout session");
    return;
  }

  const session = await response.json().catch(() => null);

  if (!session?.url) {
    showError("Invalid response from server");
    return;
  }

  window.location.href = session.url;
}

// Run checkout on page load
checkout();
