/**
 * Minimal E-commerce Checkout Backend
 * Supports both Stripe and PayPal checkout sessions
 *
 * Environment variables:
 *   SITE_HOST            - Your site's domain(s) (e.g., example.com or example.com,shop.example.com)
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

// Parse comma-separated hosts into array of origins
const SITE_HOSTS = SITE_HOST.split(",")
  .map((h) => h.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = SITE_HOSTS.map((host) => `https://${host}`);

// CORS - allow all configured sites dynamically
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like server-to-server or curl)
      if (!origin) {
        return callback(null, true);
      }
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, origin);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
  }),
);

app.use(express.json());

// Logging helper
const logRequest = (origin, message) => {
  console.log(
    `[${new Date().toISOString()}] ${origin || "unknown"} - ${message}`,
  );
};

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    hosts: SITE_HOSTS,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    paypal: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET),
  });
});

// ============================================
// SKU PRICE VALIDATION
// ============================================

// Cache for SKU prices per origin (refreshed periodically)
const skuPricesCache = new Map(); // origin -> { data, expiry }
const SKU_CACHE_TTL = 60000; // 1 minute cache

async function getSkuPrices(origin) {
  const cached = skuPricesCache.get(origin);

  // Return cached data if still valid
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const response = await fetch(`${origin}/api/sku_prices.json`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch SKU prices from ${origin}: ${response.status}`,
    );
  }

  const data = await response.json();
  skuPricesCache.set(origin, { data, expiry: Date.now() + SKU_CACHE_TTL });

  return data;
}

/**
 * Validate a single cart item against SKU prices
 * Returns { error: string } or { cartItem: {...} }
 */
function validateCartItem(item, skuPrices) {
  const { sku, quantity } = item;

  if (!sku) return { error: "Item is missing SKU" };

  const skuData = skuPrices[sku];
  if (!skuData) return { error: `Unknown SKU: ${sku}` };

  if (skuData.max_quantity !== null && quantity > skuData.max_quantity) {
    return {
      error: `SKU ${sku}: quantity ${quantity} exceeds maximum ${skuData.max_quantity}`,
    };
  }

  return {
    cartItem: {
      name: skuData.name,
      sku,
      unit_price: skuData.unit_price,
      quantity,
    },
  };
}

/**
 * Validate cart items against authoritative SKU prices
 * Expects items as [{ sku, quantity }, ...]
 * Returns { valid: true, cart: [...], total: number } or { valid: false, errors: [...] }
 */
async function validateCart(items, origin) {
  const skuPrices = await getSkuPrices(origin);

  const results = items.map((item) => validateCartItem(item, skuPrices));
  const errors = results.filter((r) => r.error).map((r) => r.error);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const cart = results.map((r) => r.cartItem);
  const total = cart.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );

  return { valid: true, cart, total };
}

const isValidOrigin = (origin) => origin && ALLOWED_ORIGINS.includes(origin);
const isValidItems = (items) =>
  items && Array.isArray(items) && items.length > 0;

/**
 * Middleware to validate items from request body
 * Attaches validated cart, total, and origin to req if valid
 */
async function validateItemsMiddleware(req, res, next) {
  const { items } = req.body;
  const origin = req.get("origin");

  if (!isValidOrigin(origin)) {
    logRequest(origin, "rejected - invalid origin");
    return res.status(403).json({ error: "Invalid or missing origin" });
  }

  if (!isValidItems(items)) {
    logRequest(origin, "empty cart");
    return res.status(400).json({ error: "Items array is empty or invalid" });
  }

  try {
    const validation = await validateCart(items, origin);
    if (!validation.valid) {
      logRequest(origin, "cart validation failed");
      return res
        .status(400)
        .json({ error: "Cart validation failed", details: validation.errors });
    }

    logRequest(origin, `cart validated (${items.length} items)`);
    req.validatedCart = validation.cart;
    req.cartTotal = validation.total;
    req.siteOrigin = origin;
    next();
  } catch (error) {
    logRequest(origin, `validation error: ${error.message}`);
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
        success_url: `${req.siteOrigin}/order-complete/`,
        cancel_url: `${req.siteOrigin}/`,
      });

      console.log(
        `[${new Date().toISOString()}] ${req.siteOrigin} - Stripe session created`,
      );
      res.json({ id: session.id, url: session.url });
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] ${req.siteOrigin} - Stripe error: ${error.message}`,
      );
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// PAYPAL CHECKOUT
// ============================================

// Cache PayPal access token
const state = { token: null, expiry: 0 };

async function getPaypalToken() {
  // Return cached token if still valid (with 60s buffer)
  if (state.token && Date.now() < state.expiry - 60000) {
    return state.token;
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
  state.token = data.access_token;
  state.expiry = Date.now() + data.expires_in * 1000;

  return state.token;
}

app.post(
  "/api/paypal/create-order",
  validateItemsMiddleware,
  async (req, res) => {
    try {
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
        return res.status(500).json({ error: "PayPal not configured" });
      }

      const accessToken = await getPaypalToken();
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
          return_url: `${req.siteOrigin}/order-complete/`,
          cancel_url: `${req.siteOrigin}/`,
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
        console.error(
          `[${new Date().toISOString()}] ${req.siteOrigin} - PayPal order error:`,
          errorData,
        );
        throw new Error(`PayPal order failed: ${response.status}`);
      }

      const order = await response.json();
      const approveLink = order.links.find((l) => l.rel === "approve");

      console.log(
        `[${new Date().toISOString()}] ${req.siteOrigin} - PayPal order created`,
      );
      res.json({
        id: order.id,
        url: approveLink ? approveLink.href : null,
      });
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] ${req.siteOrigin} - PayPal error: ${error.message}`,
      );
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// START SERVER
// ============================================

// Export for testing
module.exports = { app, skuPricesCache, ALLOWED_ORIGINS };

// Only start server if run directly (not imported for tests)
if (require.main === module) {
  app.listen(3000, () => {
    console.log(
      `[${new Date().toISOString()}] Checkout backend running on port 3000`,
    );
    console.log(`  Sites: ${SITE_HOSTS.join(", ")}`);
    console.log(
      `  Stripe: ${process.env.STRIPE_SECRET_KEY ? "configured" : "not configured"}`,
    );
    console.log(
      `  PayPal: ${process.env.PAYPAL_CLIENT_ID ? "configured" : "not configured"}`,
    );
    console.log(`  Currency: ${CURRENCY}`);
  });
}
