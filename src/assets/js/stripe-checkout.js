// Stripe Checkout Page
// Handles the redirect flow: checks cart and redirects to Stripe or homepage

import { getCart } from "./cart-utils.js";

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
  const stripeKey = main.dataset.stripeKey;
  const checkoutApiUrl = main.dataset.checkoutApiUrl;

  const cart = getCart();

  // If cart is empty, redirect to homepage
  if (cart.length === 0) {
    statusMessage.textContent = "Redirecting to homepage...";
    window.location.href = "/";
    return;
  }

  // Check configuration
  if (!stripeKey) {
    showError("Stripe is not configured");
    return;
  }

  if (!checkoutApiUrl) {
    showError("Checkout backend is not configured");
    return;
  }

  statusMessage.textContent = "Redirecting to Stripe...";

  try {
    // Prepare cart items (SKU + quantity only)
    const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));

    // Create Stripe session via backend
    const response = await fetch(
      `${checkoutApiUrl}/api/stripe/create-session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      },
    );

    if (response.ok) {
      const session = await response.json();

      // Prefer direct URL redirect if available
      if (session.url) {
        window.location.href = session.url;
        return;
      }

      // Fall back to Stripe.js redirect
      if (session.id) {
        const stripe = Stripe(stripeKey);
        const result = await stripe.redirectToCheckout({
          sessionId: session.id,
        });

        if (result.error) {
          showError(result.error.message);
        }
        return;
      }

      showError("Invalid response from server");
    } else {
      const error = await response.json();
      showError(error.error || "Failed to create checkout session");
    }
  } catch (error) {
    console.error("Stripe checkout failed:", error);
    showError("Failed to start checkout. Please try again.");
  }
}

// Run checkout on page load
checkout();
