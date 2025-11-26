/**
 * Minimal E-commerce Checkout Backend
 * Supports both Stripe and PayPal checkout sessions
 *
 * Environment variables:
 *   SITE_URL             - The single allowed origin (e.g., https://example.com)
 *   STRIPE_SECRET_KEY    - Stripe secret key (sk_live_... or sk_test_...)
 *   PAYPAL_CLIENT_ID     - PayPal REST API client ID
 *   PAYPAL_SECRET        - PayPal REST API secret
 *   PAYPAL_SANDBOX       - Set to "true" for sandbox mode (default: false)
 *   CURRENCY             - Currency code (default: GBP)
 *   BRAND_NAME           - Brand name shown on PayPal checkout
 *   PORT                 - Server port (default: 3000)
 */

const express = require("express");
const cors = require("cors");

const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL;
const CURRENCY = process.env.CURRENCY || "GBP";
const PAYPAL_BASE_URL = process.env.PAYPAL_SANDBOX === "true"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

// Validate required config
if (!SITE_URL) {
  console.error("ERROR: SITE_URL environment variable is required");
  process.exit(1);
}

// Normalize SITE_URL (remove trailing slash)
const normalizedSiteUrl = SITE_URL.replace(/\/$/, "");

// CORS - only allow the configured site
app.use(
  cors({
    origin: normalizedSiteUrl,
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    site: normalizedSiteUrl,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    paypal: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET),
  });
});

// ============================================
// STRIPE CHECKOUT
// ============================================

app.post("/api/stripe/create-session", async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const Stripe = require("stripe");
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    const { cart } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty or invalid" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: cart.map((item) => ({
        price_data: {
          currency: CURRENCY.toLowerCase(),
          product_data: { name: item.item_name },
          unit_amount: Math.round(item.unit_price * 100),
        },
        quantity: item.quantity,
      })),
      success_url: `${normalizedSiteUrl}/checkout-success/`,
      cancel_url: `${normalizedSiteUrl}/`,
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PAYPAL CHECKOUT
// ============================================

// Cache PayPal access token
let paypalToken = null;
let paypalTokenExpiry = 0;

async function getPayPalAccessToken() {
  // Return cached token if still valid (with 60s buffer)
  if (paypalToken && Date.now() < paypalTokenExpiry - 60000) {
    return paypalToken;
  }

  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString("base64");

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${response.status}`);
  }

  const data = await response.json();
  paypalToken = data.access_token;
  paypalTokenExpiry = Date.now() + data.expires_in * 1000;

  return paypalToken;
}

app.post("/api/paypal/create-order", async (req, res) => {
  try {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
      return res.status(500).json({ error: "PayPal not configured" });
    }

    const { cart } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty or invalid" });
    }

    const accessToken = await getPayPalAccessToken();

    // Calculate totals
    const itemTotal = cart
      .reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
      .toFixed(2);

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: CURRENCY,
            value: itemTotal,
            breakdown: {
              item_total: {
                currency_code: CURRENCY,
                value: itemTotal,
              },
            },
          },
          items: cart.map((item) => ({
            name: item.item_name.substring(0, 127), // PayPal has 127 char limit
            unit_amount: {
              currency_code: CURRENCY,
              value: item.unit_price.toFixed(2),
            },
            quantity: item.quantity.toString(),
          })),
        },
      ],
      application_context: {
        return_url: `${normalizedSiteUrl}/checkout-success/`,
        cancel_url: `${normalizedSiteUrl}/`,
        user_action: "PAY_NOW",
        brand_name: process.env.BRAND_NAME || "Shop",
      },
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("PayPal order error:", errorData);
      throw new Error(`PayPal order failed: ${response.status}`);
    }

    const order = await response.json();
    const approveLink = order.links.find((l) => l.rel === "approve");

    res.json({
      id: order.id,
      url: approveLink ? approveLink.href : null,
    });
  } catch (error) {
    console.error("PayPal error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`Checkout backend running on port ${PORT}`);
  console.log(`  Site URL: ${normalizedSiteUrl}`);
  console.log(`  Stripe: ${process.env.STRIPE_SECRET_KEY ? "configured" : "not configured"}`);
  console.log(`  PayPal: ${process.env.PAYPAL_CLIENT_ID ? "configured" : "not configured"}`);
  console.log(`  Currency: ${CURRENCY}`);
});
