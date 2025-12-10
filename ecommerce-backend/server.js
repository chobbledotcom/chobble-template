/**
 * Minimal E-commerce Checkout Backend
 * Supports both Stripe and PayPal checkout sessions
 *
 * Environment variables:
 *   SITE_HOST            - Your site's domain (e.g., example.com)
 *   STRIPE_SECRET_KEY    - Stripe secret key (sk_live_... or sk_test_...)
 *   PAYPAL_CLIENT_ID     - PayPal REST API client ID
 *   PAYPAL_SECRET        - PayPal REST API secret
 *   PAYPAL_SANDBOX       - Set to "true" for sandbox mode (default: false)
 *   CURRENCY             - Currency code (default: GBP)
 *   BRAND_NAME           - Brand name shown on PayPal checkout
 */

const express = require("express");
const cors = require("cors");

const app = express();

// Configuration
const SITE_HOST = process.env.SITE_HOST;
const CURRENCY = process.env.CURRENCY || "GBP";
const PAYPAL_BASE_URL =
  process.env.PAYPAL_SANDBOX === "true"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

const BRAND_NAME = process.env.BRAND_NAME;

// Validate required config
if (!SITE_HOST) {
  console.error("ERROR: SITE_HOST environment variable is required");
  process.exit(1);
}
if (!BRAND_NAME) {
  console.error("ERROR: BRAND_NAME environment variable is required");
  process.exit(1);
}

const SITE_ORIGIN = `https://${SITE_HOST}`;

// CORS - only allow the configured site
app.use(
  cors({
    origin: SITE_ORIGIN,
    methods: ["GET", "POST"],
  }),
);

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    host: SITE_HOST,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    paypal: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET),
  });
});

// ============================================
// SKU PRICE VALIDATION
// ============================================

// Cache for SKU prices (refreshed periodically)
let skuPricesCache = null;
let skuPricesCacheExpiry = 0;
const SKU_CACHE_TTL = 60000; // 1 minute cache

async function getSkuPrices() {
  // Return cached data if still valid
  if (skuPricesCache && Date.now() < skuPricesCacheExpiry) {
    return skuPricesCache;
  }

  const response = await fetch(`${SITE_ORIGIN}/api/sku_prices.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch SKU prices: ${response.status}`);
  }

  skuPricesCache = await response.json();
  skuPricesCacheExpiry = Date.now() + SKU_CACHE_TTL;

  return skuPricesCache;
}

/**
 * Validate cart items against authoritative SKU prices
 * Expects items as [{ sku, quantity }, ...]
 * Returns { valid: true, cart: [...], total: number } or { valid: false, errors: [...] }
 */
async function validateCart(items) {
  const skuPrices = await getSkuPrices();
  const errors = [];
  const cart = [];

  for (const item of items) {
    const { sku, quantity } = item;

    if (!sku) {
      errors.push("Item is missing SKU");
      continue;
    }

    const skuData = skuPrices[sku];

    if (!skuData) {
      errors.push(`Unknown SKU: ${sku}`);
      continue;
    }

    if (skuData.max_quantity !== null && quantity > skuData.max_quantity) {
      errors.push(
        `SKU ${sku}: quantity ${quantity} exceeds maximum ${skuData.max_quantity}`,
      );
      continue;
    }

    cart.push({
      name: skuData.name,
      sku,
      unit_price: skuData.unit_price,
      quantity,
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const total = cart.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );

  return { valid: true, cart, total };
}

/**
 * Middleware to validate items from request body
 * Attaches validated cart and total to req if valid
 */
async function validateItemsMiddleware(req, res, next) {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items array is empty or invalid" });
  }

  try {
    const validation = await validateCart(items);
    if (!validation.valid) {
      return res.status(400).json({
        error: "Cart validation failed",
        details: validation.errors,
      });
    }

    req.validatedCart = validation.cart;
    req.cartTotal = validation.total;
    next();
  } catch (error) {
    console.error("Validation error:", error.message);
    res.status(500).json({ error: error.message });
  }
}

// ============================================
// STRIPE CHECKOUT
// ============================================

app.post(
  "/api/stripe/create-session",
  validateItemsMiddleware,
  async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: "Stripe not configured" });
      }

      const Stripe = require("stripe");
      const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: req.validatedCart.map((item) => ({
          price_data: {
            currency: CURRENCY.toLowerCase(),
            product_data: { name: item.name },
            unit_amount: Math.round(item.unit_price * 100),
          },
          quantity: item.quantity,
        })),
        success_url: `${SITE_ORIGIN}/checkout-success/`,
        cancel_url: `${SITE_ORIGIN}/`,
      });

      res.json({ id: session.id, url: session.url });
    } catch (error) {
      console.error("Stripe error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },
);

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
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`,
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

app.post(
  "/api/paypal/create-order",
  validateItemsMiddleware,
  async (req, res) => {
    try {
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
        return res.status(500).json({ error: "PayPal not configured" });
      }

      const accessToken = await getPayPalAccessToken();
      const itemTotal = req.cartTotal.toFixed(2);

      const orderPayload = {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: CURRENCY,
              value: itemTotal,
              breakdown: {
                item_total: { currency_code: CURRENCY, value: itemTotal },
              },
            },
            items: req.validatedCart.map((item) => ({
              name: item.name.substring(0, 127), // PayPal has 127 char limit
              unit_amount: {
                currency_code: CURRENCY,
                value: item.unit_price.toFixed(2),
              },
              quantity: item.quantity.toString(),
            })),
          },
        ],
        application_context: {
          return_url: `${SITE_ORIGIN}/checkout-success/`,
          cancel_url: `${SITE_ORIGIN}/`,
          user_action: "PAY_NOW",
          brand_name: BRAND_NAME,
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
  },
);

// ============================================
// START SERVER
// ============================================

app.listen(3000, () => {
  console.log(`Checkout backend running on port 3000`);
  console.log(`  Site: ${SITE_ORIGIN}`);
  console.log(
    `  Stripe: ${process.env.STRIPE_SECRET_KEY ? "configured" : "not configured"}`,
  );
  console.log(
    `  PayPal: ${process.env.PAYPAL_CLIENT_ID ? "configured" : "not configured"}`,
  );
  console.log(`  Currency: ${CURRENCY}`);
});
