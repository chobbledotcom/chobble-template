// Stripe Checkout Page
// Handles the redirect flow: checks cart and redirects to Stripe or homepage

import { getCart, getCheckoutItems } from "#public/utils/cart-utils.js";
import Config from "#public/utils/config.js";
import { postJson } from "#public/utils/http.js";
import { sendNtfyNotification } from "#public/utils/ntfy.js";
import { validateCartWithCache } from "#public/utils/products-cache.js";

const showStatusError = (message) => {
  const statusMessage = document.getElementById("status-message");
  statusMessage.textContent = message;
  statusMessage.classList.add("error");
};

const getCheckoutUrl = () =>
  `https://${Config.ecommerce_api_host}/api/checkout`;

const createStripeSession = async (items) => {
  const session = await postJson(getCheckoutUrl(), {
    items,
    success_url: `${window.location.origin}/order-complete/`,
    cancel_url: `${window.location.origin}/cart/`,
  });
  if (!session?.url) return { error: "Failed to create checkout session" };
  return { url: session.url };
};

const checkout = async () => {
  const main = document.querySelector(".stripe-checkout-page");
  if (!main) return;

  const statusMessage = document.getElementById("status-message");
  const cart = getCart();

  if (cart.length === 0) {
    statusMessage.textContent = "Redirecting to homepage...";
    window.location.href = "/";
    return;
  }

  if (!Config.ecommerce_api_host) {
    sendNtfyNotification("Checkout backend is not configured");
    showStatusError("Checkout backend is not configured");
    return;
  }

  statusMessage.textContent = "Validating cart...";
  await validateCartWithCache();

  // Re-read cart after validation (items may have been removed)
  const validatedCart = getCart();
  if (validatedCart.length === 0) {
    statusMessage.textContent =
      "Your cart is empty. Redirecting to homepage...";
    window.location.href = "/";
    return;
  }

  statusMessage.textContent = "Redirecting to Stripe...";
  const result = await createStripeSession(getCheckoutItems());

  if (result.error) {
    sendNtfyNotification(`Stripe checkout failed: ${result.error}`);
    showStatusError(result.error);
    return;
  }
  window.location.href = result.url;
};

// Run checkout on page load
checkout();
