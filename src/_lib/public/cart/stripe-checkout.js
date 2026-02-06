// Stripe Checkout Page
// Handles the redirect flow: checks cart and redirects to Stripe or homepage

import { getCart, getCheckoutItems } from "#public/utils/cart-utils.js";
import { postJson } from "#public/utils/http.js";

function showStatusError(message) {
  const statusMessage = document.getElementById("status-message");
  statusMessage.textContent = message;
  statusMessage.classList.add("error");
}

const createStripeSession = async (checkoutApiUrl, items) => {
  const session = await postJson(checkoutApiUrl, {
    items,
    success_url: `${window.location.origin}/order-complete/`,
    cancel_url: `${window.location.origin}/cart/`,
  });
  if (!session?.url) return { error: "Failed to create checkout session" };
  return { url: session.url };
};

async function checkout() {
  const main = document.querySelector(".stripe-checkout-page");
  if (!main) return;

  const statusMessage = document.getElementById("status-message");
  const cart = getCart();

  if (cart.length === 0) {
    statusMessage.textContent = "Redirecting to homepage...";
    window.location.href = "/";
    return;
  }

  if (!main.dataset.checkoutApiUrl) {
    showStatusError("Checkout backend is not configured");
    return;
  }

  statusMessage.textContent = "Redirecting to Stripe...";
  const result = await createStripeSession(
    main.dataset.checkoutApiUrl,
    getCheckoutItems(),
  );

  if (result.error) {
    showStatusError(result.error);
    return;
  }
  window.location.href = result.url;
}

// Run checkout on page load
checkout();
