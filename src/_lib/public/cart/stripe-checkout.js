// Stripe Checkout Page
// Handles the redirect flow: checks cart and redirects to Stripe or homepage

import { getCart, getCheckoutItems } from "#public/utils/cart-utils.js";

function showError(message) {
  const statusMessage = document.getElementById("status-message");
  statusMessage.textContent = message;
  statusMessage.classList.add("error");
}

const createStripeSession = async (checkoutApiUrl, items) => {
  const response = await fetch(checkoutApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  }).catch(() => null);

  if (!response)
    return {
      error: "Failed to connect. Please check your internet and try again.",
    };
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { error: data.error || "Failed to create checkout session" };
  }
  const session = await response.json().catch(() => null);
  if (!session?.url) return { error: "Invalid response from server" };
  return { url: session.url };
};

async function checkout() {
  const main = document.querySelector(".stripe-checkout-page");
  if (!main) return;

  const statusMessage = document.getElementById("status-message");
  const checkoutApiUrl = main.dataset.checkoutApiUrl;
  const cart = getCart();

  if (cart.length === 0) {
    statusMessage.textContent = "Redirecting to homepage...";
    window.location.href = "/";
    return;
  }

  if (!checkoutApiUrl) {
    showError("Checkout backend is not configured");
    return;
  }

  statusMessage.textContent = "Redirecting to Stripe...";
  const result = await createStripeSession(checkoutApiUrl, getCheckoutItems());

  if (result.error) {
    showError(result.error);
    return;
  }
  window.location.href = result.url;
}

// Run checkout on page load
checkout();
