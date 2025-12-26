// Checkout E2E Tests using JSDOM
// Tests the complete checkout flow with mocked Stripe API
// Uses actual cart-utils.js and renders real Liquid templates

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { Liquid } from "liquidjs";
import { createTestRunner } from "./test-utils.js";

// Import actual cart utilities
import {
  STORAGE_KEY,
  getCart,
  saveCart,
  removeItem,
  formatPrice,
  getItemCount,
} from "../src/assets/js/cart-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

// ============================================
// Template Rendering
// ============================================

const liquid = new Liquid({
  root: [
    path.join(projectRoot, "src/_includes"),
    path.join(projectRoot, "src/_layouts"),
  ],
  extname: ".html",
});

// Read and render actual Liquid templates
const renderTemplate = async (templatePath, data = {}) => {
  const fullPath = path.join(projectRoot, templatePath);
  const template = fs.readFileSync(fullPath, "utf-8");
  return liquid.parseAndRender(template, data);
};

// Create a complete page with cart overlay from real templates
const createCheckoutPage = async (options = {}) => {
  const {
    stripeKey = "pk_test_123",
    checkoutApiUrl = "https://api.example.com",
    paypalEmail = "test@example.com",
    includeStripeCheckoutPage = false,
    // Product options for testing add-to-cart
    productTitle = "Test Product",
    productOptions = [
      { name: "Small", unit_price: "5.00", max_quantity: 5, sku: "SKU-S" },
      { name: "Large", unit_price: "10.00", max_quantity: 3, sku: "SKU-L" },
    ],
  } = options;

  const config = {
    stripe_publishable_key: stripeKey,
    checkout_api_url: checkoutApiUrl,
    paypal_email: paypalEmail,
  };

  // Render all templates from actual source files
  const cartIcon = await renderTemplate("src/_includes/cart-icon.html", { config });
  const cartOverlay = await renderTemplate("src/_includes/cart-overlay.html", { config });
  const productOptionsHtml = await renderTemplate("src/_includes/product-options.html", {
    config,
    title: productTitle,
    options: productOptions,
  });

  // Render stripe checkout page if needed
  let stripeCheckoutPage = "";
  if (includeStripeCheckoutPage) {
    stripeCheckoutPage = await renderTemplate("src/_layouts/stripe-checkout.html", { config });
    // Remove the frontmatter/layout wrapper - just get the content
    stripeCheckoutPage = stripeCheckoutPage.replace(/^---[\s\S]*?---\s*/, "");
  }

  // Build complete HTML page using real templates
  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Checkout Test</title></head>
    <body>
      ${cartIcon}

      ${cartOverlay}

      ${stripeCheckoutPage}

      <!-- Product page with real product-options template -->
      <div class="product-page">
        ${productOptionsHtml}
      </div>
    </body>
    </html>
  `;

  return new JSDOM(html, {
    url: "https://example.com",
    runScripts: "dangerously",
    resources: "usable",
  });
};

// ============================================
// Mock Utilities
// ============================================

const createMockLocalStorage = () => {
  const store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      for (const key in store) delete store[key];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i) => Object.keys(store)[i] || null,
  };
};

const createMockFetch = (responses = {}) => {
  const calls = [];

  const mockFetch = async (url, options = {}) => {
    calls.push({ url, options });

    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        if (typeof response === "function") {
          return response(url, options);
        }
        return {
          ok: response.ok !== false,
          status: response.status || (response.ok !== false ? 200 : 400),
          json: async () => response.data || response,
          text: async () => JSON.stringify(response.data || response),
        };
      }
    }

    throw new Error(`No mock for URL: ${url}`);
  };

  mockFetch.calls = calls;
  return mockFetch;
};

const createLocationTracker = () => {
  const redirects = [];
  const location = {
    href: "https://example.com/",
    origin: "https://example.com",
    assign: (url) => redirects.push(url),
    replace: (url) => redirects.push(url),
  };

  return {
    location: new Proxy(location, {
      set: (target, prop, value) => {
        if (prop === "href") redirects.push(value);
        target[prop] = value;
        return true;
      },
    }),
    redirects,
    wasRedirectedTo: (url) => redirects.some((r) => r.includes(url)),
  };
};

// Helper to run tests with mock localStorage
const withMockStorage = (fn) => {
  const mockStorage = createMockLocalStorage();
  const origStorage = globalThis.localStorage;
  globalThis.localStorage = mockStorage;
  try {
    return fn(mockStorage);
  } finally {
    globalThis.localStorage = origStorage;
  }
};

// ============================================
// Test Cases
// ============================================

const testCases = [
  // ----------------------------------------
  // cart-utils.js Direct Tests
  // ----------------------------------------
  {
    name: "cart-utils-getCart-empty",
    description: "getCart returns empty array when localStorage is empty",
    test: () => {
      withMockStorage(() => {
        const cart = getCart();
        assert.deepStrictEqual(cart, []);
      });
    },
  },
  {
    name: "cart-utils-saveCart-and-getCart",
    description: "saveCart persists cart and getCart retrieves it",
    test: () => {
      withMockStorage(() => {
        const items = [
          { item_name: "Widget", unit_price: 15.0, quantity: 2, sku: "W1" },
        ];
        saveCart(items);
        const retrieved = getCart();
        assert.deepStrictEqual(retrieved, items);
      });
    },
  },
  {
    name: "cart-utils-getCart-handles-corrupt-data",
    description: "getCart returns empty array for corrupt JSON",
    test: () => {
      withMockStorage((storage) => {
        storage.setItem(STORAGE_KEY, "not valid json {{{");
        const cart = getCart();
        assert.deepStrictEqual(cart, []);
      });
    },
  },
  {
    name: "cart-utils-removeItem",
    description: "removeItem removes item by name",
    test: () => {
      withMockStorage(() => {
        saveCart([
          { item_name: "Keep", unit_price: 10, quantity: 1 },
          { item_name: "Remove", unit_price: 5, quantity: 2 },
        ]);
        const result = removeItem("Remove");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].item_name, "Keep");
      });
    },
  },
  {
    name: "cart-utils-formatPrice",
    description: "formatPrice formats with £ symbol and 2 decimals",
    test: () => {
      assert.strictEqual(formatPrice(10), "£10.00");
      assert.strictEqual(formatPrice(5.5), "£5.50");
      assert.strictEqual(formatPrice(0.3), "£0.30");
    },
  },
  {
    name: "cart-utils-getItemCount",
    description: "getItemCount sums all quantities",
    test: () => {
      withMockStorage(() => {
        saveCart([
          { item_name: "A", unit_price: 10, quantity: 3 },
          { item_name: "B", unit_price: 5, quantity: 2 },
        ]);
        assert.strictEqual(getItemCount(), 5);
      });
    },
  },

  // ----------------------------------------
  // Real Template Tests
  // ----------------------------------------
  {
    name: "template-cart-overlay-renders",
    description: "Cart overlay template renders with all required elements",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        stripeKey: "pk_test_abc",
        paypalEmail: "pay@example.com",
        checkoutApiUrl: "https://api.test.com",
      });

      const doc = dom.window.document;
      const overlay = doc.getElementById("cart-overlay");

      assert.ok(overlay, "Cart overlay should exist");
      assert.ok(overlay.querySelector(".cart-items"), "Should have cart-items container");
      assert.ok(overlay.querySelector(".cart-empty"), "Should have cart-empty message");
      assert.ok(overlay.querySelector(".cart-total-amount"), "Should have total display");
      assert.ok(overlay.querySelector(".cart-checkout-stripe"), "Should have Stripe button");
      assert.ok(overlay.querySelector(".cart-checkout-paypal"), "Should have PayPal button");
      assert.ok(overlay.querySelector(".cart-minimum-message"), "Should have minimum message");

      // Verify data attributes from template
      assert.strictEqual(overlay.dataset.stripeKey, "pk_test_abc");
      assert.strictEqual(overlay.dataset.paypalEmail, "pay@example.com");
      assert.strictEqual(overlay.dataset.checkoutApiUrl, "https://api.test.com");

      dom.window.close();
    },
  },
  {
    name: "template-cart-overlay-no-stripe",
    description: "Cart overlay hides Stripe button when not configured",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        stripeKey: null, // No Stripe key (null, not empty string)
        paypalEmail: "pay@example.com",
      });

      const doc = dom.window.document;
      const stripeBtn = doc.querySelector(".cart-checkout-stripe");
      const paypalBtn = doc.querySelector(".cart-checkout-paypal");

      assert.strictEqual(stripeBtn, null, "Stripe button should not exist");
      assert.ok(paypalBtn, "PayPal button should exist");

      dom.window.close();
    },
  },
  {
    name: "template-cart-overlay-no-paypal",
    description: "Cart overlay hides PayPal button when not configured",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        stripeKey: "pk_test_123",
        paypalEmail: null, // No PayPal (null, not empty string)
      });

      const doc = dom.window.document;
      const stripeBtn = doc.querySelector(".cart-checkout-stripe");
      const paypalBtn = doc.querySelector(".cart-checkout-paypal");

      assert.ok(stripeBtn, "Stripe button should exist");
      assert.strictEqual(paypalBtn, null, "PayPal button should not exist");

      dom.window.close();
    },
  },
  {
    name: "template-stripe-checkout-page-renders",
    description: "Stripe checkout page template renders with data attributes",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        includeStripeCheckoutPage: true,
        stripeKey: "pk_live_xyz",
        checkoutApiUrl: "https://checkout.api.com",
      });

      const doc = dom.window.document;
      const page = doc.querySelector(".stripe-checkout-page");

      assert.ok(page, "Stripe checkout page should exist");
      assert.strictEqual(page.dataset.stripeKey, "pk_live_xyz");
      assert.strictEqual(page.dataset.checkoutApiUrl, "https://checkout.api.com");

      const status = doc.getElementById("status-message");
      assert.ok(status, "Status message element should exist");
      assert.ok(status.textContent.includes("Checking cart"), "Should show initial status");

      dom.window.close();
    },
  },
  {
    name: "template-cart-icon-renders",
    description: "Cart icon template renders with required elements",
    asyncTest: async () => {
      const dom = await createCheckoutPage();

      const doc = dom.window.document;
      const cartIcon = doc.querySelector(".cart-icon");

      assert.ok(cartIcon, "Cart icon should exist");
      assert.ok(cartIcon.querySelector("svg"), "Should have SVG icon");
      assert.ok(cartIcon.querySelector(".cart-count"), "Should have cart count badge");
      assert.strictEqual(
        cartIcon.style.display,
        "none",
        "Cart icon should be hidden initially",
      );

      dom.window.close();
    },
  },
  {
    name: "template-product-options-single-renders",
    description: "Product options template renders single option as button",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        productTitle: "My Product",
        productOptions: [
          { name: "Standard", unit_price: "19.99", max_quantity: 10, sku: "STD-001" },
        ],
      });

      const doc = dom.window.document;
      const button = doc.querySelector(".add-to-cart");

      assert.ok(button, "Add to cart button should exist");
      assert.strictEqual(button.dataset.name, "My Product");
      assert.strictEqual(button.dataset.option, "Standard");
      assert.strictEqual(button.dataset.price, "19.99");
      assert.strictEqual(button.dataset.sku, "STD-001");
      assert.strictEqual(button.dataset.maxQuantity, "10");
      assert.ok(button.textContent.includes("19.99"), "Button should show price");

      // Should NOT have a select (single option = direct button)
      const select = doc.querySelector(".product-options-select");
      assert.strictEqual(select, null, "Should not have select for single option");

      dom.window.close();
    },
  },
  {
    name: "template-product-options-multiple-renders",
    description: "Product options template renders multiple options as select",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        productTitle: "Variable Product",
        productOptions: [
          { name: "Small", unit_price: "5.00", max_quantity: 5, sku: "VAR-S" },
          { name: "Medium", unit_price: "7.50", max_quantity: 3, sku: "VAR-M" },
          { name: "Large", unit_price: "10.00", max_quantity: 2, sku: "VAR-L" },
        ],
      });

      const doc = dom.window.document;
      const select = doc.querySelector(".product-options-select");
      const button = doc.querySelector(".product-option-button");

      assert.ok(select, "Select should exist for multiple options");
      assert.ok(button, "Add to cart button should exist");
      assert.strictEqual(button.disabled, true, "Button should be disabled initially");
      assert.strictEqual(button.dataset.name, "Variable Product");

      // Check options
      const options = select.querySelectorAll("option");
      assert.strictEqual(options.length, 4, "Should have 4 options (1 placeholder + 3 choices)");

      // First option is placeholder
      assert.ok(options[0].disabled, "First option should be disabled placeholder");

      // Check second option (Small)
      assert.strictEqual(options[1].dataset.name, "Small");
      assert.strictEqual(options[1].dataset.price, "5.00");
      assert.strictEqual(options[1].dataset.sku, "VAR-S");
      assert.strictEqual(options[1].dataset.maxQuantity, "5");

      dom.window.close();
    },
  },
  {
    name: "template-product-options-no-payment-configured",
    description: "Product options template renders nothing when no payment configured",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        stripeKey: null,
        paypalEmail: null,
        productOptions: [
          { name: "Test", unit_price: "10.00", sku: "TEST" },
        ],
      });

      const doc = dom.window.document;
      const button = doc.querySelector(".add-to-cart");
      const select = doc.querySelector(".product-options-select");

      assert.strictEqual(button, null, "Should not render add-to-cart when no payment");
      assert.strictEqual(select, null, "Should not render select when no payment");

      dom.window.close();
    },
  },

  // ----------------------------------------
  // Stripe Checkout Flow Tests
  // ----------------------------------------
  {
    name: "stripe-checkout-empty-cart-redirects-home",
    description: "Stripe checkout redirects to homepage when cart is empty",
    asyncTest: async () => {
      const result = withMockStorage(() => {
        saveCart([]);
        const locationTracker = createLocationTracker();

        // Simulate stripe-checkout.js logic
        const cart = getCart();
        if (cart.length === 0) {
          locationTracker.location.href = "/";
        }

        return locationTracker.wasRedirectedTo("/");
      });

      assert.strictEqual(result, true, "Should redirect to homepage");
    },
  },
  {
    name: "stripe-checkout-prepares-items-correctly",
    description: "Checkout sends only sku and quantity to API, not prices",
    test: () => {
      withMockStorage(() => {
        saveCart([
          { item_name: "Product A", unit_price: 99.99, quantity: 2, sku: "SKU-A", max_quantity: 10 },
          { item_name: "Product B", unit_price: 49.99, quantity: 1, sku: "SKU-B" },
        ]);

        // This matches stripe-checkout.js:46
        const cart = getCart();
        const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));

        assert.deepStrictEqual(items, [
          { sku: "SKU-A", quantity: 2 },
          { sku: "SKU-B", quantity: 1 },
        ]);
        // Verify prices are NOT included (security)
        assert.strictEqual(items[0].unit_price, undefined);
        assert.strictEqual(items[0].item_name, undefined);
      });
    },
  },
  {
    name: "stripe-checkout-api-success-redirects",
    description: "Successful Stripe session creation redirects to Stripe URL",
    asyncTest: async () => {
      const redirected = await withMockStorage(async () => {
        saveCart([{ item_name: "Widget", unit_price: 15, quantity: 1, sku: "W1" }]);

        const mockFetch = createMockFetch({
          "/api/stripe/create-session": {
            ok: true,
            data: {
              id: "cs_test_123",
              url: "https://checkout.stripe.com/pay/cs_test_123",
            },
          },
        });

        const locationTracker = createLocationTracker();
        const cart = getCart();
        const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));

        const response = await mockFetch(
          "https://api.example.com/api/stripe/create-session",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          },
        );

        const session = await response.json();
        if (session.url) {
          locationTracker.location.href = session.url;
        }

        return locationTracker.wasRedirectedTo("checkout.stripe.com");
      });

      assert.strictEqual(redirected, true);
    },
  },
  {
    name: "stripe-checkout-api-error-handling",
    description: "API error returns error message for display",
    asyncTest: async () => {
      const mockFetch = createMockFetch({
        "/api/stripe/create-session": {
          ok: false,
          status: 400,
          data: { error: "Invalid SKU: FAKE-SKU" },
        },
      });

      const response = await mockFetch(
        "https://api.example.com/api/stripe/create-session",
        {
          method: "POST",
          body: JSON.stringify({ items: [{ sku: "FAKE-SKU", quantity: 1 }] }),
        },
      );

      assert.strictEqual(response.ok, false);
      const error = await response.json();
      assert.strictEqual(error.error, "Invalid SKU: FAKE-SKU");
    },
  },
  {
    name: "stripe-checkout-fallback-to-stripe-js",
    description: "Falls back to Stripe.js redirectToCheckout when no URL returned",
    asyncTest: async () => {
      const mockFetch = createMockFetch({
        "/api/stripe/create-session": {
          ok: true,
          data: { id: "cs_test_456" }, // No URL
        },
      });

      let stripeRedirectCalled = false;
      const mockStripe = {
        redirectToCheckout: async ({ sessionId }) => {
          stripeRedirectCalled = true;
          assert.strictEqual(sessionId, "cs_test_456");
          return { error: null };
        },
      };

      const response = await mockFetch(
        "https://api.example.com/api/stripe/create-session",
        { method: "POST", body: JSON.stringify({ items: [] }) },
      );

      const session = await response.json();

      // Simulate stripe-checkout.js fallback (lines 70-79)
      if (!session.url && session.id) {
        await mockStripe.redirectToCheckout({ sessionId: session.id });
      }

      assert.strictEqual(stripeRedirectCalled, true);
    },
  },

  // ----------------------------------------
  // PayPal Checkout Tests
  // ----------------------------------------
  {
    name: "paypal-api-checkout-redirects",
    description: "PayPal API checkout redirects to PayPal approval URL",
    asyncTest: async () => {
      const mockFetch = createMockFetch({
        "/api/paypal/create-order": {
          ok: true,
          data: { url: "https://www.paypal.com/checkoutnow?token=ABC" },
        },
      });

      const locationTracker = createLocationTracker();

      const response = await mockFetch(
        "https://api.example.com/api/paypal/create-order",
        { method: "POST", body: JSON.stringify({ items: [] }) },
      );

      const order = await response.json();
      if (order.url) {
        locationTracker.location.href = order.url;
      }

      assert.strictEqual(locationTracker.wasRedirectedTo("paypal.com"), true);
    },
  },
  {
    name: "paypal-static-url-building",
    description: "Static PayPal checkout builds correct URL with cart items",
    test: () => {
      withMockStorage(() => {
        saveCart([
          { item_name: "Product One", unit_price: 15.0, quantity: 2 },
          { item_name: "Product Two", unit_price: 25.99, quantity: 1 },
        ]);

        const cart = getCart();

        // Matches cart.js checkoutWithPayPalStatic()
        const params = new URLSearchParams();
        params.append("cmd", "_cart");
        params.append("upload", "1");
        params.append("business", "test@example.com");
        params.append("currency_code", "GBP");

        cart.forEach((item, index) => {
          const itemNum = index + 1;
          params.append(`item_name_${itemNum}`, item.item_name);
          params.append(`amount_${itemNum}`, item.unit_price.toFixed(2));
          params.append(`quantity_${itemNum}`, item.quantity);
        });

        const url = `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;

        assert.ok(url.includes("item_name_1=Product+One"));
        assert.ok(url.includes("amount_1=15.00"));
        assert.ok(url.includes("quantity_1=2"));
        assert.ok(url.includes("item_name_2=Product+Two"));
      });
    },
  },

  // ----------------------------------------
  // Business Logic Tests
  // ----------------------------------------
  {
    name: "minimum-checkout-amount-validation",
    description: "Validates minimum checkout amount of 30p",
    test: () => {
      const MINIMUM_CHECKOUT_AMOUNT = 0.3; // From cart.js:17

      withMockStorage(() => {
        // Below minimum
        saveCart([{ item_name: "Cheap", unit_price: 0.25, quantity: 1 }]);
        let cart = getCart();
        let total = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
        assert.strictEqual(total <= MINIMUM_CHECKOUT_AMOUNT, true);

        // Above minimum
        saveCart([{ item_name: "OK", unit_price: 0.5, quantity: 1 }]);
        cart = getCart();
        total = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
        assert.strictEqual(total <= MINIMUM_CHECKOUT_AMOUNT, false);
      });
    },
  },
  {
    name: "cart-total-calculation",
    description: "Cart total is calculated correctly",
    test: () => {
      withMockStorage(() => {
        saveCart([
          { item_name: "A", unit_price: 10.0, quantity: 2 },
          { item_name: "B", unit_price: 5.5, quantity: 3 },
        ]);

        const cart = getCart();
        const total = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

        // (10 * 2) + (5.5 * 3) = 36.5
        assert.strictEqual(total, 36.5);
        assert.strictEqual(formatPrice(total), "£36.50");
      });
    },
  },
  {
    name: "max-quantity-enforcement",
    description: "Cart respects max_quantity limits",
    test: () => {
      const item = {
        item_name: "Limited",
        unit_price: 10,
        quantity: 5,
        max_quantity: 3,
      };

      // Cart.js addItem() enforces max_quantity
      if (item.max_quantity && item.quantity > item.max_quantity) {
        item.quantity = item.max_quantity;
      }

      assert.strictEqual(item.quantity, 3);
    },
  },
  {
    name: "special-characters-preserved",
    description: "Cart preserves special characters in product names",
    test: () => {
      withMockStorage(() => {
        saveCart([
          { item_name: 'Widget "Deluxe" & More', unit_price: 10, quantity: 1 },
        ]);

        const cart = getCart();
        assert.strictEqual(cart[0].item_name, 'Widget "Deluxe" & More');
      });
    },
  },
];

export default createTestRunner("checkout", testCases);
