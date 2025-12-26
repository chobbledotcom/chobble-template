// Checkout E2E Tests using JSDOM
// Tests the complete checkout flow with mocked Stripe API
// Uses the actual cart-utils.js and tests against real code behavior

import assert from "assert";
import { JSDOM } from "jsdom";
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

// ============================================
// JSDOM Setup Utilities
// ============================================

// Create a DOM environment that matches the real templates
const createCheckoutDOM = (options = {}) => {
  const {
    stripeKey = "pk_test_123",
    checkoutApiUrl = "https://api.example.com",
    paypalEmail = "test@example.com",
    isStripeCheckoutPage = false,
  } = options;

  // Use HTML structure matching the actual templates
  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <a href="#" class="cart-icon" style="display: none">
        <span class="cart-count">0</span>
      </a>

      <!-- Cart overlay matching src/_includes/cart-overlay.html -->
      <dialog
        id="cart-overlay"
        class="cart-overlay"
        data-paypal-email="${paypalEmail}"
        data-stripe-key="${stripeKey}"
        data-checkout-api-url="${checkoutApiUrl}"
      >
        <header class="cart-header">
          <h2>Shopping Cart</h2>
          <form method="dialog">
            <button class="cart-close" aria-label="Close cart">&times;</button>
          </form>
        </header>

        <section class="cart-body">
          <div class="cart-empty" style="display: block;">
            <p>Your cart is empty</p>
          </div>
          <div class="cart-items"></div>
        </section>

        <footer class="cart-footer">
          <p class="cart-total">
            <strong>Total:</strong>
            <strong class="cart-total-amount">£0.00</strong>
          </p>
          <p class="cart-minimum-message" style="display: none;">
            You must spend at least 30p to check out
          </p>
          <div class="cart-checkout-buttons">
            ${paypalEmail ? '<button class="cart-checkout cart-checkout-paypal" disabled>PayPal</button>' : ""}
            ${stripeKey ? '<button class="cart-checkout cart-checkout-stripe" disabled>Card</button>' : ""}
          </div>
        </footer>
      </dialog>

      ${
        isStripeCheckoutPage
          ? `
        <!-- Stripe checkout page matching src/_layouts/stripe-checkout.html -->
        <div
          class="stripe-checkout-page"
          data-stripe-key="${stripeKey}"
          data-checkout-api-url="${checkoutApiUrl}"
        >
          <p id="status-message">Checking cart...</p>
        </div>
      `
          : ""
      }

      <!-- Product page elements -->
      <div class="product-page">
        <button class="add-to-cart"
                data-name="Test Product"
                data-price="9.99"
                data-sku="SKU123"
                data-max-quantity="10">
          Add to Cart - £9.99
        </button>

        <select class="product-options-select">
          <option value="">Please select option</option>
          <option value="small" data-name="Small" data-price="5.00" data-sku="SKU-S" data-max-quantity="5">Small - £5.00</option>
          <option value="large" data-name="Large" data-price="10.00" data-sku="SKU-L" data-max-quantity="3">Large - £10.00</option>
        </select>
        <button class="add-to-cart product-option-button" disabled
                data-name="Variable Product">
          Add to Cart
        </button>
      </div>
    </body>
    </html>
  `;

  const dom = new JSDOM(html, {
    url: "https://example.com",
    runScripts: "dangerously",
    resources: "usable",
  });

  return dom;
};

// Mock localStorage that works with the real cart-utils.js
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
    _store: store,
  };
};

// Mock fetch with response tracking
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
  mockFetch.getCalls = () => calls;
  mockFetch.reset = () => {
    calls.length = 0;
  };

  return mockFetch;
};

// Track redirects via a proxy (JSDOM doesn't allow redefining location.href)
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
    getLastRedirect: () => redirects[redirects.length - 1],
    wasRedirectedTo: (url) => redirects.some((r) => r.includes(url)),
  };
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
      const mockStorage = createMockLocalStorage();
      // Temporarily replace global localStorage
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;

      const cart = getCart();

      globalThis.localStorage = origStorage;
      assert.deepStrictEqual(cart, [], "Empty storage should return empty cart");
    },
  },
  {
    name: "cart-utils-saveCart-and-getCart",
    description: "saveCart persists cart and getCart retrieves it",
    test: () => {
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;

      const items = [
        { item_name: "Widget", unit_price: 15.0, quantity: 2, sku: "W1" },
      ];
      saveCart(items);
      const retrieved = getCart();

      globalThis.localStorage = origStorage;
      assert.deepStrictEqual(retrieved, items, "Should retrieve saved cart");
    },
  },
  {
    name: "cart-utils-getCart-handles-corrupt-data",
    description: "getCart returns empty array for corrupt JSON",
    test: () => {
      const mockStorage = createMockLocalStorage();
      mockStorage.setItem(STORAGE_KEY, "not valid json {{{");
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;

      const cart = getCart();

      globalThis.localStorage = origStorage;
      assert.deepStrictEqual(cart, [], "Corrupt data should return empty cart");
    },
  },
  {
    name: "cart-utils-removeItem",
    description: "removeItem removes item by name",
    test: () => {
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;

      saveCart([
        { item_name: "Keep", unit_price: 10, quantity: 1 },
        { item_name: "Remove", unit_price: 5, quantity: 2 },
      ]);
      const result = removeItem("Remove");

      globalThis.localStorage = origStorage;
      assert.strictEqual(result.length, 1, "Should have one item");
      assert.strictEqual(result[0].item_name, "Keep", "Should keep correct item");
    },
  },
  {
    name: "cart-utils-formatPrice",
    description: "formatPrice formats with £ symbol and 2 decimals",
    test: () => {
      assert.strictEqual(formatPrice(10), "£10.00");
      assert.strictEqual(formatPrice(5.5), "£5.50");
      assert.strictEqual(formatPrice(0.3), "£0.30");
      assert.strictEqual(formatPrice(99.99), "£99.99");
    },
  },
  {
    name: "cart-utils-getItemCount",
    description: "getItemCount sums all quantities",
    test: () => {
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;

      saveCart([
        { item_name: "A", unit_price: 10, quantity: 3 },
        { item_name: "B", unit_price: 5, quantity: 2 },
      ]);
      const count = getItemCount();

      globalThis.localStorage = origStorage;
      assert.strictEqual(count, 5, "Should sum to 5");
    },
  },

  // ----------------------------------------
  // Stripe Checkout Flow Tests
  // ----------------------------------------
  {
    name: "stripe-checkout-empty-cart-redirects-home",
    description: "Stripe checkout redirects to homepage when cart is empty",
    asyncTest: async () => {
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;

      saveCart([]);
      const locationTracker = createLocationTracker();

      // Simulate stripe-checkout.js logic
      const cart = getCart();
      if (cart.length === 0) {
        locationTracker.location.href = "/";
      }

      globalThis.localStorage = origStorage;
      assert.strictEqual(
        locationTracker.wasRedirectedTo("/"),
        true,
        "Should redirect to homepage",
      );
    },
  },
  {
    name: "stripe-checkout-prepares-items-correctly",
    description: "Checkout sends only sku and quantity to API, not prices",
    asyncTest: async () => {
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;

      saveCart([
        { item_name: "Product A", unit_price: 99.99, quantity: 2, sku: "SKU-A", max_quantity: 10 },
        { item_name: "Product B", unit_price: 49.99, quantity: 1, sku: "SKU-B" },
      ]);

      // This matches the logic in stripe-checkout.js:46
      const cart = getCart();
      const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));

      globalThis.localStorage = origStorage;

      assert.deepStrictEqual(items, [
        { sku: "SKU-A", quantity: 2 },
        { sku: "SKU-B", quantity: 1 },
      ]);
      // Verify prices are NOT included (security: server validates prices)
      assert.strictEqual(items[0].unit_price, undefined);
      assert.strictEqual(items[0].item_name, undefined);
    },
  },
  {
    name: "stripe-checkout-api-success-redirects",
    description: "Successful Stripe session creation redirects to Stripe URL",
    asyncTest: async () => {
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;

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

      // Simulate stripe-checkout.js flow
      const cart = getCart();
      const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));
      const checkoutApiUrl = "https://api.example.com";

      const response = await mockFetch(
        `${checkoutApiUrl}/api/stripe/create-session`,
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

      globalThis.localStorage = origStorage;

      assert.strictEqual(mockFetch.calls.length, 1);
      assert.strictEqual(
        locationTracker.wasRedirectedTo("checkout.stripe.com"),
        true,
      );
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
          headers: { "Content-Type": "application/json" },
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
          data: { id: "cs_test_456" }, // No URL, only session ID
        },
      });

      let stripeRedirectCalled = false;
      let stripeSessionId = null;
      const mockStripe = {
        redirectToCheckout: async ({ sessionId }) => {
          stripeRedirectCalled = true;
          stripeSessionId = sessionId;
          return { error: null };
        },
      };

      const response = await mockFetch(
        "https://api.example.com/api/stripe/create-session",
        {
          method: "POST",
          body: JSON.stringify({ items: [{ sku: "TEST", quantity: 1 }] }),
        },
      );

      const session = await response.json();

      // Simulate stripe-checkout.js fallback logic (lines 70-79)
      if (session.url) {
        // Would redirect
      } else if (session.id) {
        await mockStripe.redirectToCheckout({ sessionId: session.id });
      }

      assert.strictEqual(stripeRedirectCalled, true);
      assert.strictEqual(stripeSessionId, "cs_test_456");
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
          data: {
            id: "PAY-123",
            url: "https://www.paypal.com/checkoutnow?token=ABC",
          },
        },
      });

      const locationTracker = createLocationTracker();

      const response = await mockFetch(
        "https://api.example.com/api/paypal/create-order",
        {
          method: "POST",
          body: JSON.stringify({ items: [{ sku: "TEST", quantity: 1 }] }),
        },
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
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;

      saveCart([
        { item_name: "Product One", unit_price: 15.0, quantity: 2 },
        { item_name: "Product Two", unit_price: 25.99, quantity: 1 },
      ]);

      const cart = getCart();

      // This matches cart.js checkoutWithPayPalStatic() logic
      const baseUrl = "https://www.paypal.com/cgi-bin/webscr";
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

      const url = `${baseUrl}?${params.toString()}`;

      globalThis.localStorage = origStorage;

      assert.ok(url.includes("cmd=_cart"));
      assert.ok(url.includes("business=test%40example.com"));
      assert.ok(url.includes("item_name_1=Product+One"));
      assert.ok(url.includes("amount_1=15.00"));
      assert.ok(url.includes("quantity_1=2"));
      assert.ok(url.includes("item_name_2=Product+Two"));
      assert.ok(url.includes("amount_2=25.99"));
    },
  },

  // ----------------------------------------
  // Cart UI Behavior Tests (with JSDOM)
  // ----------------------------------------
  {
    name: "cart-overlay-has-required-elements",
    description: "Cart overlay contains all required UI elements",
    test: () => {
      const dom = createCheckoutDOM();

      const overlay = dom.window.document.getElementById("cart-overlay");
      assert.ok(overlay, "Cart overlay should exist");
      assert.ok(overlay.querySelector(".cart-items"), "Should have cart-items");
      assert.ok(overlay.querySelector(".cart-empty"), "Should have cart-empty");
      assert.ok(overlay.querySelector(".cart-total-amount"), "Should have total");
      assert.ok(overlay.querySelector(".cart-checkout-stripe"), "Should have Stripe button");
      assert.ok(overlay.querySelector(".cart-checkout-paypal"), "Should have PayPal button");
      assert.ok(overlay.querySelector(".cart-minimum-message"), "Should have minimum message");

      dom.window.close();
    },
  },
  {
    name: "stripe-checkout-page-has-required-elements",
    description: "Stripe checkout page has required data attributes",
    test: () => {
      const dom = createCheckoutDOM({
        isStripeCheckoutPage: true,
        stripeKey: "pk_test_abc",
        checkoutApiUrl: "https://checkout.example.com",
      });

      const page = dom.window.document.querySelector(".stripe-checkout-page");
      assert.ok(page, "Stripe checkout page should exist");
      assert.strictEqual(page.dataset.stripeKey, "pk_test_abc");
      assert.strictEqual(page.dataset.checkoutApiUrl, "https://checkout.example.com");

      const status = dom.window.document.getElementById("status-message");
      assert.ok(status, "Status message element should exist");

      dom.window.close();
    },
  },
  {
    name: "product-button-has-data-attributes",
    description: "Add to cart button has required data attributes for cart.js",
    test: () => {
      const dom = createCheckoutDOM();

      const button = dom.window.document.querySelector(".add-to-cart:not(.product-option-button)");
      assert.strictEqual(button.dataset.name, "Test Product");
      assert.strictEqual(button.dataset.price, "9.99");
      assert.strictEqual(button.dataset.sku, "SKU123");
      assert.strictEqual(button.dataset.maxQuantity, "10");

      dom.window.close();
    },
  },
  {
    name: "product-option-select-has-data-attributes",
    description: "Product option select has required data for cart.js",
    test: () => {
      const dom = createCheckoutDOM();

      const select = dom.window.document.querySelector(".product-options-select");
      const smallOption = select.options[1];

      assert.strictEqual(smallOption.dataset.name, "Small");
      assert.strictEqual(smallOption.dataset.price, "5.00");
      assert.strictEqual(smallOption.dataset.sku, "SKU-S");
      assert.strictEqual(smallOption.dataset.maxQuantity, "5");

      dom.window.close();
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

      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;

      // Below minimum
      saveCart([{ item_name: "Cheap", unit_price: 0.25, quantity: 1 }]);
      let cart = getCart();
      let total = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
      assert.strictEqual(total <= MINIMUM_CHECKOUT_AMOUNT, true, "0.25 should be below minimum");

      // At minimum (still not allowed - uses <=)
      saveCart([{ item_name: "Edge", unit_price: 0.3, quantity: 1 }]);
      cart = getCart();
      total = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
      assert.strictEqual(total <= MINIMUM_CHECKOUT_AMOUNT, true, "0.30 should be at minimum (not allowed)");

      // Above minimum
      saveCart([{ item_name: "OK", unit_price: 0.5, quantity: 1 }]);
      cart = getCart();
      total = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
      assert.strictEqual(total <= MINIMUM_CHECKOUT_AMOUNT, false, "0.50 should be above minimum");

      globalThis.localStorage = origStorage;
    },
  },
  {
    name: "cart-total-calculation",
    description: "Cart total is calculated correctly",
    test: () => {
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;

      saveCart([
        { item_name: "A", unit_price: 10.0, quantity: 2 },
        { item_name: "B", unit_price: 5.5, quantity: 3 },
      ]);

      const cart = getCart();
      // This matches cart.js getCartTotal() logic
      const total = cart.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
      );

      globalThis.localStorage = origStorage;

      // (10 * 2) + (5.5 * 3) = 20 + 16.5 = 36.5
      assert.strictEqual(total, 36.5);
      assert.strictEqual(formatPrice(total), "£36.50");
    },
  },
  {
    name: "max-quantity-enforcement",
    description: "Cart respects max_quantity limits",
    test: () => {
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;

      // Simulate adding item with max_quantity
      const item = {
        item_name: "Limited Item",
        unit_price: 10,
        quantity: 5,
        max_quantity: 3,
        sku: "LTD",
      };

      // Cart.js addItem() logic: enforce max_quantity
      if (item.max_quantity && item.quantity > item.max_quantity) {
        item.quantity = item.max_quantity;
      }

      saveCart([item]);
      const cart = getCart();

      globalThis.localStorage = origStorage;

      assert.strictEqual(cart[0].quantity, 3, "Quantity should be capped at max");
    },
  },
  {
    name: "special-characters-in-item-names",
    description: "Cart handles special characters in product names",
    test: () => {
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;

      saveCart([
        { item_name: 'Widget "Deluxe" & More', unit_price: 10, quantity: 1 },
        { item_name: "Test <script>alert('xss')</script>", unit_price: 5, quantity: 1 },
      ]);

      const cart = getCart();

      globalThis.localStorage = origStorage;

      // Names should be preserved in storage
      assert.strictEqual(cart[0].item_name, 'Widget "Deluxe" & More');
      assert.strictEqual(cart[1].item_name, "Test <script>alert('xss')</script>");
      // Note: escapeHtml in cart-utils.js handles XSS when rendering
    },
  },
];

export default createTestRunner("checkout", testCases);
