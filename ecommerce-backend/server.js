/**
 * Minimal E-commerce Checkout Backend (Bun Native)
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
 *   PORT                 - Server port (default: 3000)
 */

// Configuration (read lazily to allow tests to set env vars first)
const getConfig = () => {
  const SITE_HOST = process.env.SITE_HOST;
  const BRAND_NAME = process.env.BRAND_NAME;

  if (!SITE_HOST) {
    console.error("ERROR: SITE_HOST environment variable is required");
    process.exit(1);
  }
  if (!BRAND_NAME) {
    console.error("ERROR: BRAND_NAME environment variable is required");
    process.exit(1);
  }

  return { SITE_HOST, BRAND_NAME };
};

// Only validate on direct run, not on import
if (import.meta.main) {
  getConfig();
}

const CURRENCY = process.env.CURRENCY || "GBP";
const PORT = parseInt(process.env.PORT || "3000", 10);
const PAYPAL_BASE_URL =
  process.env.PAYPAL_SANDBOX === "true"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

// Parse comma-separated hosts into array of origins (mutable for testing)
const SITE_HOSTS = [];
const ALLOWED_ORIGINS = [];

function initOrigins() {
  const SITE_HOST = process.env.SITE_HOST || "";
  SITE_HOSTS.length = 0;
  ALLOWED_ORIGINS.length = 0;

  SITE_HOST.split(",")
    .map((h) => h.trim())
    .filter(Boolean)
    .forEach((host) => {
      SITE_HOSTS.push(host);
      ALLOWED_ORIGINS.push(`https://${host}`);
    });
}

// Initialize on load if env is set
if (process.env.SITE_HOST) {
  initOrigins();
}

// ============================================
// HELPERS
// ============================================

const logRequest = (origin, message) => {
  console.log(
    `[${new Date().toISOString()}] ${origin || "unknown"} - ${message}`,
  );
};

const json = (data, status = 200, origin = null) => {
  const headers = { "Content-Type": "application/json" };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return new Response(JSON.stringify(data), { status, headers });
};

const isValidOrigin = (origin) => origin && ALLOWED_ORIGINS.includes(origin);
const isValidItems = (items) =>
  items && Array.isArray(items) && items.length > 0;

// ============================================
// SKU PRICE VALIDATION
// ============================================

const skuPricesCache = new Map();
const SKU_CACHE_TTL = 60000;

async function getSkuPrices(origin) {
  const cached = skuPricesCache.get(origin);
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

async function validateCart(items, origin) {
  const skuPrices = await getSkuPrices(origin);
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

async function validateRequest(req) {
  const origin = req.headers.get("origin");

  if (!isValidOrigin(origin)) {
    logRequest(origin, "rejected - invalid origin");
    return { error: json({ error: "Invalid or missing origin" }, 403, origin) };
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return { error: json({ error: "Invalid JSON" }, 400, origin) };
  }

  const { items } = body;

  if (!isValidItems(items)) {
    logRequest(origin, "empty cart");
    return {
      error: json({ error: "Items array is empty or invalid" }, 400, origin),
    };
  }

  try {
    const validation = await validateCart(items, origin);
    if (!validation.valid) {
      logRequest(origin, "cart validation failed");
      return {
        error: json(
          { error: "Cart validation failed", details: validation.errors },
          400,
          origin,
        ),
      };
    }

    logRequest(origin, `cart validated (${items.length} items)`);
    return {
      cart: validation.cart,
      total: validation.total,
      origin,
    };
  } catch (error) {
    logRequest(origin, `validation error: ${error.message}`);
    return { error: json({ error: error.message }, 500, origin) };
  }
}

// ============================================
// STRIPE CHECKOUT
// ============================================

async function handleStripeCreateSession(req) {
  const validated = await validateRequest(req);
  if (validated.error) return validated.error;

  const { cart, total, origin } = validated;

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return json({ error: "Stripe not configured" }, 500, origin);
    }

    const Stripe = require("stripe");
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: cart.map((item) => ({
        price_data: {
          currency: CURRENCY.toLowerCase(),
          product_data: { name: item.name },
          unit_amount: Math.round(item.unit_price * 100),
        },
        quantity: item.quantity,
      })),
      success_url: `${origin}/order-complete/`,
      cancel_url: `${origin}/`,
    });

    console.log(
      `[${new Date().toISOString()}] ${origin} - Stripe session created`,
    );
    return json({ id: session.id, url: session.url }, 200, origin);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ${origin} - Stripe error: ${error.message}`,
    );
    return json({ error: error.message }, 500, origin);
  }
}

// ============================================
// PAYPAL CHECKOUT
// ============================================

const paypalState = { token: null, expiry: 0 };

async function getPaypalToken() {
  if (paypalState.token && Date.now() < paypalState.expiry - 60000) {
    return paypalState.token;
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
  paypalState.token = data.access_token;
  paypalState.expiry = Date.now() + data.expires_in * 1000;

  return paypalState.token;
}

async function handlePaypalCreateOrder(req) {
  const validated = await validateRequest(req);
  if (validated.error) return validated.error;

  const { cart, total, origin } = validated;

  try {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
      return json({ error: "PayPal not configured" }, 500, origin);
    }

    const accessToken = await getPaypalToken();
    const itemTotal = total.toFixed(2);

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
          items: cart.map((item) => ({
            name: item.name.substring(0, 127),
            unit_amount: {
              currency_code: CURRENCY,
              value: item.unit_price.toFixed(2),
            },
            quantity: item.quantity.toString(),
          })),
        },
      ],
      application_context: {
        return_url: `${origin}/order-complete/`,
        cancel_url: `${origin}/`,
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
        `[${new Date().toISOString()}] ${origin} - PayPal order error:`,
        errorData,
      );
      throw new Error(`PayPal order failed: ${response.status}`);
    }

    const order = await response.json();
    const approveLink = order.links.find((l) => l.rel === "approve");

    console.log(
      `[${new Date().toISOString()}] ${origin} - PayPal order created`,
    );
    return json(
      { id: order.id, url: approveLink ? approveLink.href : null },
      200,
      origin,
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ${origin} - PayPal error: ${error.message}`,
    );
    return json({ error: error.message }, 500, origin);
  }
}

// ============================================
// REQUEST HANDLER
// ============================================

async function handleRequest(req) {
  const url = new URL(req.url);
  const { pathname } = url;
  const method = req.method;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    const origin = req.headers.get("origin");
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    return new Response(null, { status: 204 });
  }

  // Routes
  if (method === "GET" && pathname === "/health") {
    return json({
      status: "ok",
      hosts: SITE_HOSTS,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      paypal: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET),
    });
  }

  if (method === "POST" && pathname === "/api/stripe/create-session") {
    return handleStripeCreateSession(req);
  }

  if (method === "POST" && pathname === "/api/paypal/create-order") {
    return handlePaypalCreateOrder(req);
  }

  return new Response("Not Found", { status: 404 });
}

// ============================================
// SERVER
// ============================================

// Export for testing
export { handleRequest as fetch, skuPricesCache, ALLOWED_ORIGINS, SITE_HOSTS, initOrigins };

// Export default for Bun.serve() auto-detection
export default {
  port: PORT,
  fetch: handleRequest,
};

// Log startup when run directly
if (import.meta.main) {
  console.log(
    `[${new Date().toISOString()}] Checkout backend running on port ${PORT}`,
  );
  console.log(`  Sites: ${SITE_HOSTS.join(", ")}`);
  console.log(
    `  Stripe: ${process.env.STRIPE_SECRET_KEY ? "configured" : "not configured"}`,
  );
  console.log(
    `  PayPal: ${process.env.PAYPAL_CLIENT_ID ? "configured" : "not configured"}`,
  );
  console.log(`  Currency: ${CURRENCY}`);
}
