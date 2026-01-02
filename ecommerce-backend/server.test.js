/**
 * End-to-end tests for the ecommerce backend
 * Run with: pnpm test
 */

const { describe, it, before, after } = require("node:test");
const http = require("node:http");
const assert = require("node:assert");

// Set required env vars before importing server
process.env.SITE_HOST = "site1.example.com,site2.example.com";
process.env.BRAND_NAME = "Test Brand";
process.env.CURRENCY = "GBP";

const { app, skuPricesCache, ALLOWED_ORIGINS } = require("./server.js");

// ============================================
// TEST UTILITIES
// ============================================

let server;
let mockSkuServer1;
let mockSkuServer2;
const SERVER_PORT = 3001;
const MOCK_SKU_PORT_1 = 3002;
const MOCK_SKU_PORT_2 = 3003;

// Mock SKU data for each site
const SITE1_SKU_DATA = {
  SKU001: { name: "Product One", unit_price: 10.0, max_quantity: 5 },
  SKU002: { name: "Product Two", unit_price: 25.5, max_quantity: null },
};

const SITE2_SKU_DATA = {
  "SKU-A": { name: "Different Product", unit_price: 15.0, max_quantity: 10 },
  "SKU-B": { name: "Another Item", unit_price: 30.0, max_quantity: 2 },
};

function createMockSkuServer(port, skuData) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === "/api/sku_prices.json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(skuData));
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server.listen(port, () => resolve(server));
  });
}

async function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          headers: res.headers,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data),
        });
      });
    });

    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function postJson(url, body, headers = {}) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

// ============================================
// TEST SETUP / TEARDOWN
// ============================================

async function setup() {
  // Clear SKU cache
  skuPricesCache.clear();

  // Override ALLOWED_ORIGINS to use localhost for testing
  ALLOWED_ORIGINS.length = 0;
  ALLOWED_ORIGINS.push(`http://localhost:${MOCK_SKU_PORT_1}`);
  ALLOWED_ORIGINS.push(`http://localhost:${MOCK_SKU_PORT_2}`);

  // Start mock SKU servers
  mockSkuServer1 = await createMockSkuServer(MOCK_SKU_PORT_1, SITE1_SKU_DATA);
  mockSkuServer2 = await createMockSkuServer(MOCK_SKU_PORT_2, SITE2_SKU_DATA);

  // Start main server
  await new Promise((resolve) => {
    server = app.listen(SERVER_PORT, resolve);
  });
}

async function teardown() {
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => mockSkuServer1.close(resolve));
  await new Promise((resolve) => mockSkuServer2.close(resolve));
}

// ============================================
// TESTS
// ============================================

describe("ecommerce backend", () => {
  before(async () => {
    await setup();
  });

  after(async () => {
    await teardown();
  });

  it("health endpoint returns ok", async () => {
    const res = await fetch(`http://localhost:${SERVER_PORT}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "ok");
    assert.strictEqual(Array.isArray(data.hosts), true);
  });

  it("health endpoint shows multiple hosts", async () => {
    const res = await fetch(`http://localhost:${SERVER_PORT}/health`);
    const data = await res.json();
    assert.strictEqual(data.hosts.length, 2);
    assert.strictEqual(data.hosts[0], "site1.example.com");
    assert.strictEqual(data.hosts[1], "site2.example.com");
  });

  it("POST /api/stripe/create-session rejects missing origin", async () => {
    const res = await postJson(
      `http://localhost:${SERVER_PORT}/api/stripe/create-session`,
      { items: [{ sku: "SKU001", quantity: 1 }] },
    );
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.error, "Invalid or missing origin");
  });

  it("POST /api/stripe/create-session rejects invalid origin via CORS", async () => {
    const res = await postJson(
      `http://localhost:${SERVER_PORT}/api/stripe/create-session`,
      { items: [{ sku: "SKU001", quantity: 1 }] },
      { Origin: "https://evil.com" },
    );
    // CORS middleware rejects with 500 before reaching our handler
    assert.strictEqual(res.status, 500);
  });

  it("POST /api/stripe/create-session rejects empty items", async () => {
    const res = await postJson(
      `http://localhost:${SERVER_PORT}/api/stripe/create-session`,
      { items: [] },
      { Origin: `http://localhost:${MOCK_SKU_PORT_1}` },
    );
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, "Items array is empty or invalid");
  });

  it("POST /api/stripe/create-session validates SKUs from correct origin (site1)", async () => {
    const res = await postJson(
      `http://localhost:${SERVER_PORT}/api/stripe/create-session`,
      { items: [{ sku: "INVALID_SKU", quantity: 1 }] },
      { Origin: `http://localhost:${MOCK_SKU_PORT_1}` },
    );
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, "Cart validation failed");
    assert.strictEqual(data.details[0], "Unknown SKU: INVALID_SKU");
  });

  it("POST /api/stripe/create-session validates max_quantity", async () => {
    const res = await postJson(
      `http://localhost:${SERVER_PORT}/api/stripe/create-session`,
      { items: [{ sku: "SKU001", quantity: 10 }] }, // max is 5
      { Origin: `http://localhost:${MOCK_SKU_PORT_1}` },
    );
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, "Cart validation failed");
    assert(data.details[0].includes("exceeds maximum"));
  });

  it("site1 SKUs are not valid for site2", async () => {
    // SKU001 exists on site1, but not on site2
    const res = await postJson(
      `http://localhost:${SERVER_PORT}/api/stripe/create-session`,
      { items: [{ sku: "SKU001", quantity: 1 }] },
      { Origin: `http://localhost:${MOCK_SKU_PORT_2}` },
    );
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, "Cart validation failed");
    assert.strictEqual(data.details[0], "Unknown SKU: SKU001");
  });

  it("site2 SKUs are not valid for site1", async () => {
    // SKU-A exists on site2, but not on site1
    const res = await postJson(
      `http://localhost:${SERVER_PORT}/api/stripe/create-session`,
      { items: [{ sku: "SKU-A", quantity: 1 }] },
      { Origin: `http://localhost:${MOCK_SKU_PORT_1}` },
    );
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, "Cart validation failed");
    assert.strictEqual(data.details[0], "Unknown SKU: SKU-A");
  });

  it("valid cart for site1 returns Stripe not configured (no key)", async () => {
    const res = await postJson(
      `http://localhost:${SERVER_PORT}/api/stripe/create-session`,
      { items: [{ sku: "SKU001", quantity: 2 }] },
      { Origin: `http://localhost:${MOCK_SKU_PORT_1}` },
    );
    // Should pass validation but fail on Stripe config
    assert.strictEqual(res.status, 500);
    const data = await res.json();
    assert.strictEqual(data.error, "Stripe not configured");
  });

  it("valid cart for site2 returns Stripe not configured (no key)", async () => {
    const res = await postJson(
      `http://localhost:${SERVER_PORT}/api/stripe/create-session`,
      { items: [{ sku: "SKU-A", quantity: 1 }] },
      { Origin: `http://localhost:${MOCK_SKU_PORT_2}` },
    );
    // Should pass validation but fail on Stripe config
    assert.strictEqual(res.status, 500);
    const data = await res.json();
    assert.strictEqual(data.error, "Stripe not configured");
  });

  it("POST /api/paypal/create-order returns PayPal not configured (no credentials)", async () => {
    const res = await postJson(
      `http://localhost:${SERVER_PORT}/api/paypal/create-order`,
      { items: [{ sku: "SKU001", quantity: 1 }] },
      { Origin: `http://localhost:${MOCK_SKU_PORT_1}` },
    );
    assert.strictEqual(res.status, 500);
    const data = await res.json();
    assert.strictEqual(data.error, "PayPal not configured");
  });

  it("SKU cache is per-origin", async () => {
    // Clear cache
    skuPricesCache.clear();

    // Make request from site1
    await postJson(
      `http://localhost:${SERVER_PORT}/api/stripe/create-session`,
      { items: [{ sku: "SKU001", quantity: 1 }] },
      { Origin: `http://localhost:${MOCK_SKU_PORT_1}` },
    );

    // Make request from site2
    await postJson(
      `http://localhost:${SERVER_PORT}/api/stripe/create-session`,
      { items: [{ sku: "SKU-A", quantity: 1 }] },
      { Origin: `http://localhost:${MOCK_SKU_PORT_2}` },
    );

    // Both origins should be cached
    assert.strictEqual(skuPricesCache.size, 2);
    assert(skuPricesCache.has(`http://localhost:${MOCK_SKU_PORT_1}`));
    assert(skuPricesCache.has(`http://localhost:${MOCK_SKU_PORT_2}`));
  });

  it("null max_quantity allows any quantity", async () => {
    // SKU002 has max_quantity: null
    const res = await postJson(
      `http://localhost:${SERVER_PORT}/api/stripe/create-session`,
      { items: [{ sku: "SKU002", quantity: 9999 }] },
      { Origin: `http://localhost:${MOCK_SKU_PORT_1}` },
    );
    // Should pass validation (fail on Stripe config)
    assert.strictEqual(res.status, 500);
    const data = await res.json();
    assert.strictEqual(data.error, "Stripe not configured");
  });

  it("items missing SKU are rejected", async () => {
    const res = await postJson(
      `http://localhost:${SERVER_PORT}/api/stripe/create-session`,
      { items: [{ quantity: 1 }] }, // no sku
      { Origin: `http://localhost:${MOCK_SKU_PORT_1}` },
    );
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, "Cart validation failed");
    assert.strictEqual(data.details[0], "Item is missing SKU");
  });
});
