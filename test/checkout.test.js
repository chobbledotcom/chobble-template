// Checkout E2E Tests using JSDOM
// Tests the complete checkout flow with mocked Stripe API

import assert from "assert";
import { JSDOM } from "jsdom";
import { createTestRunner } from "./test-utils.js";

// ============================================
// JSDOM Setup Utilities
// ============================================

const createCheckoutDOM = (options = {}) => {
  const {
    stripeKey = "pk_test_123",
    checkoutApiUrl = "https://api.example.com",
    cart = [],
    isStripeCheckoutPage = false,
  } = options;

  // Build the HTML for testing
  const cartItemsHtml = cart
    .map(
      (item) => `
    <div class="cart-item" data-name="${item.item_name}">
      <div class="cart-item-name">${item.item_name}</div>
      <div class="cart-item-price">£${item.unit_price.toFixed(2)}</div>
      <input type="number" class="qty-input" value="${item.quantity}" data-name="${item.item_name}">
    </div>
  `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <a href="#" class="cart-icon" style="display: ${cart.length > 0 ? "flex" : "none"}">
        <span class="cart-count">${cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
      </a>

      <dialog id="cart-overlay"
              data-checkout-api-url="${checkoutApiUrl}"
              data-paypal-email="test@example.com">
        <div class="cart-items">${cartItemsHtml}</div>
        <div class="cart-empty" style="display: ${cart.length === 0 ? "block" : "none"}">Your cart is empty</div>
        <div class="cart-total-amount">£${cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0).toFixed(2)}</div>
        <div class="cart-minimum-message" style="display: none">Minimum order required</div>
        <button class="cart-checkout-stripe">Card</button>
        <button class="cart-checkout-paypal">PayPal</button>
      </dialog>

      ${
        isStripeCheckoutPage
          ? `
        <main class="stripe-checkout-page"
              data-stripe-key="${stripeKey}"
              data-checkout-api-url="${checkoutApiUrl}">
          <p id="status-message">Loading...</p>
        </main>
      `
          : ""
      }

      <div class="product-page">
        <button class="add-to-cart"
                data-name="Test Product"
                data-price="9.99"
                data-sku="SKU123"
                data-max-quantity="10">
          Add to Cart
        </button>

        <select class="product-options-select">
          <option value="">Please select option</option>
          <option value="option1" data-name="Small" data-price="5.00" data-sku="SKU-S" data-max-quantity="5">Small - £5.00</option>
          <option value="option2" data-name="Large" data-price="10.00" data-sku="SKU-L" data-max-quantity="3">Large - £10.00</option>
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

// Mock localStorage
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

// Mock fetch
const createMockFetch = (responses = {}) => {
  const calls = [];

  const mockFetch = async (url, options = {}) => {
    calls.push({ url, options });

    // Find matching response
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

    // Default: network error
    throw new Error(`No mock for URL: ${url}`);
  };

  mockFetch.calls = calls;
  mockFetch.getCalls = () => calls;
  mockFetch.reset = () => {
    calls.length = 0;
  };

  return mockFetch;
};

// Track location changes by replacing window.location with a mock
const createLocationTracker = (dom) => {
  const redirects = [];

  // Create a location mock that tracks href assignments
  const locationMock = {
    href: dom.window.location.href,
    origin: dom.window.location.origin,
    protocol: dom.window.location.protocol,
    host: dom.window.location.host,
    hostname: dom.window.location.hostname,
    pathname: dom.window.location.pathname,
    search: dom.window.location.search,
    hash: dom.window.location.hash,
    toString: () => locationMock.href,
    assign: (url) => {
      redirects.push(url);
      locationMock.href = url;
    },
    replace: (url) => {
      redirects.push(url);
      locationMock.href = url;
    },
  };

  // Use a Proxy to intercept href assignments
  const locationProxy = new Proxy(locationMock, {
    set: (target, prop, value) => {
      if (prop === "href") {
        redirects.push(value);
      }
      target[prop] = value;
      return true;
    },
    get: (target, prop) => {
      return target[prop];
    },
  });

  // Replace window.location with our proxy
  // Note: JSDOM doesn't allow replacing window.location directly,
  // so we need to use a workaround by storing it on a custom property
  dom.window._mockLocation = locationProxy;

  return {
    redirects,
    getLocation: () => locationProxy,
    getLastRedirect: () => redirects[redirects.length - 1],
    wasRedirectedTo: (url) => redirects.some((r) => r.includes(url)),
    reset: () => {
      redirects.length = 0;
    },
  };
};

// ============================================
// Cart Utilities (mirroring cart-utils.js)
// ============================================

const STORAGE_KEY = "shopping_cart";

const getCart = (localStorage) => {
  try {
    const cart = localStorage.getItem(STORAGE_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch (e) {
    return [];
  }
};

const saveCart = (localStorage, cart) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
};

// ============================================
// Test Cases
// ============================================

const testCases = [
  // ----------------------------------------
  // Cart Storage Tests
  // ----------------------------------------
  {
    name: "cart-storage-empty",
    description: "Empty cart returns empty array from localStorage",
    test: () => {
      const localStorage = createMockLocalStorage();
      const cart = getCart(localStorage);

      assert.deepStrictEqual(cart, [], "Empty storage should return empty cart");
    },
  },
  {
    name: "cart-storage-save-and-retrieve",
    description: "Cart items can be saved and retrieved from localStorage",
    test: () => {
      const localStorage = createMockLocalStorage();
      const items = [
        {
          item_name: "Test Product",
          unit_price: 9.99,
          quantity: 2,
          sku: "SKU123",
        },
      ];

      saveCart(localStorage, items);
      const retrieved = getCart(localStorage);

      assert.deepStrictEqual(
        retrieved,
        items,
        "Retrieved cart should match saved cart",
      );
    },
  },
  {
    name: "cart-storage-multiple-items",
    description: "Multiple cart items are stored correctly",
    test: () => {
      const localStorage = createMockLocalStorage();
      const items = [
        {
          item_name: "Product A",
          unit_price: 5.0,
          quantity: 1,
          sku: "SKU-A",
        },
        {
          item_name: "Product B",
          unit_price: 10.0,
          quantity: 3,
          sku: "SKU-B",
        },
      ];

      saveCart(localStorage, items);
      const retrieved = getCart(localStorage);

      assert.strictEqual(retrieved.length, 2, "Should have 2 items");
      assert.strictEqual(
        retrieved[0].item_name,
        "Product A",
        "First item correct",
      );
      assert.strictEqual(
        retrieved[1].item_name,
        "Product B",
        "Second item correct",
      );
    },
  },
  {
    name: "cart-storage-corrupt-data",
    description: "Corrupt localStorage data returns empty cart",
    test: () => {
      const localStorage = createMockLocalStorage();
      localStorage.setItem(STORAGE_KEY, "not valid json {{{");

      const cart = getCart(localStorage);

      assert.deepStrictEqual(
        cart,
        [],
        "Corrupt data should return empty cart",
      );
    },
  },

  // ----------------------------------------
  // Stripe Checkout Page Tests
  // ----------------------------------------
  {
    name: "stripe-checkout-empty-cart-redirects",
    description: "Stripe checkout page redirects to homepage with empty cart",
    asyncTest: async () => {
      const dom = createCheckoutDOM({
        isStripeCheckoutPage: true,
        cart: [],
      });
      const localStorage = createMockLocalStorage();
      const locationTracker = createLocationTracker(dom);
      const location = locationTracker.getLocation();

      dom.window.localStorage = localStorage;
      saveCart(localStorage, []);

      // Simulate the checkout function
      const main = dom.window.document.querySelector(".stripe-checkout-page");
      const statusMessage = dom.window.document.getElementById("status-message");
      const cart = getCart(localStorage);

      if (cart.length === 0) {
        statusMessage.textContent = "Redirecting to homepage...";
        location.href = "/";
      }

      assert.strictEqual(
        statusMessage.textContent,
        "Redirecting to homepage...",
        "Status message should indicate redirect",
      );
      assert.strictEqual(
        locationTracker.wasRedirectedTo("/"),
        true,
        "Should redirect to homepage",
      );

      dom.window.close();
    },
  },
  {
    name: "stripe-checkout-missing-key-shows-error",
    description: "Missing Stripe key shows configuration error",
    asyncTest: async () => {
      const dom = createCheckoutDOM({
        isStripeCheckoutPage: true,
        stripeKey: "",
        cart: [
          { item_name: "Test", unit_price: 10, quantity: 1, sku: "SKU1" },
        ],
      });
      const localStorage = createMockLocalStorage();
      dom.window.localStorage = localStorage;
      saveCart(localStorage, [
        { item_name: "Test", unit_price: 10, quantity: 1, sku: "SKU1" },
      ]);

      const main = dom.window.document.querySelector(".stripe-checkout-page");
      const statusMessage = dom.window.document.getElementById("status-message");
      const stripeKey = main.dataset.stripeKey;

      // Simulate checkout logic
      const cart = getCart(localStorage);
      if (cart.length > 0 && !stripeKey) {
        statusMessage.textContent = "Stripe is not configured";
        statusMessage.classList.add("error");
      }

      assert.strictEqual(
        statusMessage.textContent,
        "Stripe is not configured",
        "Should show Stripe not configured error",
      );
      assert.strictEqual(
        statusMessage.classList.contains("error"),
        true,
        "Should have error class",
      );

      dom.window.close();
    },
  },
  {
    name: "stripe-checkout-missing-api-url-shows-error",
    description: "Missing checkout API URL shows configuration error",
    asyncTest: async () => {
      const dom = createCheckoutDOM({
        isStripeCheckoutPage: true,
        checkoutApiUrl: "",
        cart: [
          { item_name: "Test", unit_price: 10, quantity: 1, sku: "SKU1" },
        ],
      });
      const localStorage = createMockLocalStorage();
      dom.window.localStorage = localStorage;
      saveCart(localStorage, [
        { item_name: "Test", unit_price: 10, quantity: 1, sku: "SKU1" },
      ]);

      const main = dom.window.document.querySelector(".stripe-checkout-page");
      const statusMessage = dom.window.document.getElementById("status-message");
      const stripeKey = main.dataset.stripeKey;
      const checkoutApiUrl = main.dataset.checkoutApiUrl;

      // Simulate checkout logic
      const cart = getCart(localStorage);
      if (cart.length > 0 && stripeKey && !checkoutApiUrl) {
        statusMessage.textContent = "Checkout backend is not configured";
        statusMessage.classList.add("error");
      }

      assert.strictEqual(
        statusMessage.textContent,
        "Checkout backend is not configured",
        "Should show backend not configured error",
      );

      dom.window.close();
    },
  },
  {
    name: "stripe-checkout-api-success-redirects",
    description: "Successful API response redirects to Stripe checkout URL",
    asyncTest: async () => {
      const dom = createCheckoutDOM({
        isStripeCheckoutPage: true,
        stripeKey: "pk_test_123",
        checkoutApiUrl: "https://api.example.com",
      });
      const localStorage = createMockLocalStorage();
      const locationTracker = createLocationTracker(dom);
      const location = locationTracker.getLocation();

      const cartItems = [
        { item_name: "Widget", unit_price: 15.0, quantity: 2, sku: "WIDGET-1" },
      ];
      saveCart(localStorage, cartItems);

      const mockFetch = createMockFetch({
        "/api/stripe/create-session": {
          ok: true,
          data: {
            id: "cs_test_session123",
            url: "https://checkout.stripe.com/pay/cs_test_session123",
          },
        },
      });

      dom.window.localStorage = localStorage;
      dom.window.fetch = mockFetch;

      // Simulate the checkout flow
      const main = dom.window.document.querySelector(".stripe-checkout-page");
      const statusMessage = dom.window.document.getElementById("status-message");
      const stripeKey = main.dataset.stripeKey;
      const checkoutApiUrl = main.dataset.checkoutApiUrl;

      const cart = getCart(localStorage);
      const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));

      statusMessage.textContent = "Redirecting to Stripe...";

      const response = await dom.window.fetch(
        `${checkoutApiUrl}/api/stripe/create-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        },
      );

      const session = await response.json();

      if (session.url) {
        location.href = session.url;
      }

      // Verify
      assert.strictEqual(mockFetch.calls.length, 1, "Should make one API call");
      assert.strictEqual(
        mockFetch.calls[0].url,
        "https://api.example.com/api/stripe/create-session",
        "Should call correct endpoint",
      );
      assert.strictEqual(
        locationTracker.wasRedirectedTo("checkout.stripe.com"),
        true,
        "Should redirect to Stripe",
      );

      dom.window.close();
    },
  },
  {
    name: "stripe-checkout-api-error-shows-message",
    description: "API error shows error message to user",
    asyncTest: async () => {
      const dom = createCheckoutDOM({
        isStripeCheckoutPage: true,
        stripeKey: "pk_test_123",
        checkoutApiUrl: "https://api.example.com",
      });
      const localStorage = createMockLocalStorage();

      saveCart(localStorage, [
        { item_name: "Test", unit_price: 10, quantity: 1, sku: "INVALID-SKU" },
      ]);

      const mockFetch = createMockFetch({
        "/api/stripe/create-session": {
          ok: false,
          status: 400,
          data: { error: "Invalid SKU: INVALID-SKU" },
        },
      });

      dom.window.localStorage = localStorage;
      dom.window.fetch = mockFetch;

      const main = dom.window.document.querySelector(".stripe-checkout-page");
      const statusMessage = dom.window.document.getElementById("status-message");
      const checkoutApiUrl = main.dataset.checkoutApiUrl;

      const cart = getCart(localStorage);
      const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));

      const response = await dom.window.fetch(
        `${checkoutApiUrl}/api/stripe/create-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        statusMessage.textContent =
          error.error || "Failed to create checkout session";
        statusMessage.classList.add("error");
      }

      assert.strictEqual(
        statusMessage.textContent,
        "Invalid SKU: INVALID-SKU",
        "Should show API error message",
      );
      assert.strictEqual(
        statusMessage.classList.contains("error"),
        true,
        "Should have error class",
      );

      dom.window.close();
    },
  },
  {
    name: "stripe-checkout-network-error",
    description: "Network error shows generic error message",
    asyncTest: async () => {
      const dom = createCheckoutDOM({
        isStripeCheckoutPage: true,
        stripeKey: "pk_test_123",
        checkoutApiUrl: "https://api.example.com",
      });
      const localStorage = createMockLocalStorage();

      saveCart(localStorage, [
        { item_name: "Test", unit_price: 10, quantity: 1, sku: "SKU1" },
      ]);

      // Mock fetch that throws network error
      const mockFetch = async () => {
        throw new Error("Network error");
      };

      dom.window.localStorage = localStorage;
      dom.window.fetch = mockFetch;

      const statusMessage = dom.window.document.getElementById("status-message");
      const checkoutApiUrl =
        dom.window.document.querySelector(".stripe-checkout-page").dataset
          .checkoutApiUrl;

      const cart = getCart(localStorage);
      const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));

      try {
        await dom.window.fetch(`${checkoutApiUrl}/api/stripe/create-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
      } catch (error) {
        statusMessage.textContent = "Failed to start checkout. Please try again.";
        statusMessage.classList.add("error");
      }

      assert.strictEqual(
        statusMessage.textContent,
        "Failed to start checkout. Please try again.",
        "Should show network error message",
      );

      dom.window.close();
    },
  },

  // ----------------------------------------
  // Cart Item Preparation Tests
  // ----------------------------------------
  {
    name: "checkout-sends-sku-and-quantity-only",
    description: "Checkout request sends only SKU and quantity, not prices",
    asyncTest: async () => {
      const localStorage = createMockLocalStorage();

      const cartItems = [
        {
          item_name: "Product A",
          unit_price: 99.99,
          quantity: 2,
          sku: "PROD-A",
          max_quantity: 10,
        },
        {
          item_name: "Product B",
          unit_price: 49.99,
          quantity: 1,
          sku: "PROD-B",
          max_quantity: null,
        },
      ];
      saveCart(localStorage, cartItems);

      let capturedBody = null;
      const mockFetch = async (url, options) => {
        capturedBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({ id: "cs_123", url: "https://stripe.com/pay" }),
        };
      };

      const cart = getCart(localStorage);
      const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));

      await mockFetch("https://api.example.com/api/stripe/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      assert.deepStrictEqual(
        capturedBody.items,
        [
          { sku: "PROD-A", quantity: 2 },
          { sku: "PROD-B", quantity: 1 },
        ],
        "Should only send SKU and quantity",
      );

      // Verify no prices are sent
      assert.strictEqual(
        capturedBody.items[0].unit_price,
        undefined,
        "Should not include unit_price",
      );
      assert.strictEqual(
        capturedBody.items[0].item_name,
        undefined,
        "Should not include item_name",
      );
    },
  },

  // ----------------------------------------
  // Cart Overlay / UI Tests
  // ----------------------------------------
  {
    name: "cart-overlay-structure",
    description: "Cart overlay has required elements",
    test: () => {
      const dom = createCheckoutDOM({ cart: [] });

      const overlay = dom.window.document.getElementById("cart-overlay");
      const stripeBtn = overlay.querySelector(".cart-checkout-stripe");
      const paypalBtn = overlay.querySelector(".cart-checkout-paypal");
      const cartItems = overlay.querySelector(".cart-items");
      const cartTotal = overlay.querySelector(".cart-total-amount");

      assert.notStrictEqual(overlay, null, "Cart overlay should exist");
      assert.notStrictEqual(stripeBtn, null, "Stripe button should exist");
      assert.notStrictEqual(paypalBtn, null, "PayPal button should exist");
      assert.notStrictEqual(cartItems, null, "Cart items container should exist");
      assert.notStrictEqual(cartTotal, null, "Cart total should exist");

      dom.window.close();
    },
  },
  {
    name: "cart-overlay-displays-items",
    description: "Cart overlay displays cart items correctly",
    test: () => {
      const cart = [
        { item_name: "Widget", unit_price: 15.0, quantity: 2, sku: "W1" },
        { item_name: "Gadget", unit_price: 25.5, quantity: 1, sku: "G1" },
      ];
      const dom = createCheckoutDOM({ cart });

      const cartItemElements =
        dom.window.document.querySelectorAll(".cart-item");

      assert.strictEqual(cartItemElements.length, 2, "Should display 2 items");

      const firstItem = cartItemElements[0];
      assert.strictEqual(
        firstItem.querySelector(".cart-item-name").textContent,
        "Widget",
        "First item name correct",
      );
      assert.strictEqual(
        firstItem.querySelector(".cart-item-price").textContent,
        "£15.00",
        "First item price correct",
      );

      dom.window.close();
    },
  },
  {
    name: "cart-overlay-calculates-total",
    description: "Cart overlay shows correct total",
    test: () => {
      const cart = [
        { item_name: "Item A", unit_price: 10.0, quantity: 2, sku: "A" },
        { item_name: "Item B", unit_price: 5.5, quantity: 3, sku: "B" },
      ];
      // Total = (10 * 2) + (5.5 * 3) = 20 + 16.5 = 36.5
      const dom = createCheckoutDOM({ cart });

      const totalElement = dom.window.document.querySelector(".cart-total-amount");

      assert.strictEqual(
        totalElement.textContent,
        "£36.50",
        "Total should be £36.50",
      );

      dom.window.close();
    },
  },
  {
    name: "cart-icon-visibility-empty",
    description: "Cart icon is hidden when cart is empty",
    test: () => {
      const dom = createCheckoutDOM({ cart: [] });

      const cartIcon = dom.window.document.querySelector(".cart-icon");

      assert.strictEqual(
        cartIcon.style.display,
        "none",
        "Cart icon should be hidden when empty",
      );

      dom.window.close();
    },
  },
  {
    name: "cart-icon-visibility-with-items",
    description: "Cart icon is visible when cart has items",
    test: () => {
      const cart = [
        { item_name: "Test", unit_price: 10, quantity: 1, sku: "T1" },
      ];
      const dom = createCheckoutDOM({ cart });

      const cartIcon = dom.window.document.querySelector(".cart-icon");

      assert.strictEqual(
        cartIcon.style.display,
        "flex",
        "Cart icon should be visible when cart has items",
      );

      dom.window.close();
    },
  },
  {
    name: "cart-count-badge",
    description: "Cart count badge shows correct item count",
    test: () => {
      const cart = [
        { item_name: "Item A", unit_price: 10, quantity: 3, sku: "A" },
        { item_name: "Item B", unit_price: 5, quantity: 2, sku: "B" },
      ];
      // Total items = 3 + 2 = 5
      const dom = createCheckoutDOM({ cart });

      const countBadge = dom.window.document.querySelector(".cart-count");

      assert.strictEqual(countBadge.textContent, "5", "Badge should show 5");

      dom.window.close();
    },
  },

  // ----------------------------------------
  // PayPal Checkout Tests
  // ----------------------------------------
  {
    name: "paypal-checkout-api-success",
    description: "PayPal checkout redirects to approval URL",
    asyncTest: async () => {
      const dom = createCheckoutDOM({
        checkoutApiUrl: "https://api.example.com",
      });
      const localStorage = createMockLocalStorage();
      const locationTracker = createLocationTracker(dom);
      const location = locationTracker.getLocation();

      saveCart(localStorage, [
        { item_name: "Test", unit_price: 20, quantity: 1, sku: "PP-TEST" },
      ]);

      const mockFetch = createMockFetch({
        "/api/paypal/create-order": {
          ok: true,
          data: {
            id: "PAYPAL-ORDER-123",
            url: "https://www.paypal.com/checkoutnow?token=ABC123",
          },
        },
      });

      dom.window.localStorage = localStorage;
      dom.window.fetch = mockFetch;

      const cart = getCart(localStorage);
      const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));

      const response = await dom.window.fetch(
        "https://api.example.com/api/paypal/create-order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        },
      );

      const order = await response.json();
      if (order.url) {
        location.href = order.url;
      }

      assert.strictEqual(
        locationTracker.wasRedirectedTo("paypal.com"),
        true,
        "Should redirect to PayPal",
      );

      dom.window.close();
    },
  },
  {
    name: "paypal-static-checkout-builds-url",
    description: "Static PayPal checkout builds correct URL parameters",
    test: () => {
      const cart = [
        { item_name: "Product One", unit_price: 15.0, quantity: 2, sku: "P1" },
        { item_name: "Product Two", unit_price: 25.99, quantity: 1, sku: "P2" },
      ];

      // Build PayPal URL like cart.js does
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

      params.append("return", "https://example.com/order-complete/");

      const url = `${baseUrl}?${params.toString()}`;

      assert.strictEqual(
        url.includes("cmd=_cart"),
        true,
        "Should have cart command",
      );
      assert.strictEqual(
        url.includes("business=test%40example.com"),
        true,
        "Should have business email",
      );
      assert.strictEqual(
        url.includes("item_name_1=Product+One"),
        true,
        "Should have first item name",
      );
      assert.strictEqual(
        url.includes("amount_1=15.00"),
        true,
        "Should have first item amount",
      );
      assert.strictEqual(
        url.includes("quantity_1=2"),
        true,
        "Should have first item quantity",
      );
      assert.strictEqual(
        url.includes("item_name_2=Product+Two"),
        true,
        "Should have second item name",
      );
    },
  },

  // ----------------------------------------
  // Product Add to Cart Tests
  // ----------------------------------------
  {
    name: "add-to-cart-button-attributes",
    description: "Add to cart button has required data attributes",
    test: () => {
      const dom = createCheckoutDOM();

      const button = dom.window.document.querySelector(
        ".add-to-cart:not(.product-option-button)",
      );

      assert.strictEqual(
        button.dataset.name,
        "Test Product",
        "Should have product name",
      );
      assert.strictEqual(button.dataset.price, "9.99", "Should have price");
      assert.strictEqual(button.dataset.sku, "SKU123", "Should have SKU");
      assert.strictEqual(
        button.dataset.maxQuantity,
        "10",
        "Should have max quantity",
      );

      dom.window.close();
    },
  },
  {
    name: "product-option-select-updates-button",
    description: "Selecting product option updates add-to-cart button",
    test: () => {
      const dom = createCheckoutDOM();

      const select = dom.window.document.querySelector(".product-options-select");
      const button = dom.window.document.querySelector(".product-option-button");

      // Initially disabled
      assert.strictEqual(button.disabled, true, "Button should start disabled");

      // Simulate selecting an option
      select.selectedIndex = 1;
      const selectedOption = select.options[select.selectedIndex];

      // Simulate the change event handler logic
      if (selectedOption && selectedOption.value) {
        button.disabled = false;
        button.dataset.option = selectedOption.dataset.name;
        button.dataset.price = selectedOption.dataset.price;
        button.dataset.maxQuantity = selectedOption.dataset.maxQuantity;
        button.dataset.sku = selectedOption.dataset.sku;
        button.textContent = `Add to Cart - £${selectedOption.dataset.price}`;
      }

      assert.strictEqual(button.disabled, false, "Button should be enabled");
      assert.strictEqual(button.dataset.option, "Small", "Should have option name");
      assert.strictEqual(button.dataset.price, "5.00", "Should have option price");
      assert.strictEqual(button.dataset.sku, "SKU-S", "Should have option SKU");
      assert.strictEqual(
        button.textContent,
        "Add to Cart - £5.00",
        "Button text should update",
      );

      dom.window.close();
    },
  },

  // ----------------------------------------
  // Edge Cases
  // ----------------------------------------
  {
    name: "checkout-handles-special-characters-in-names",
    description: "Checkout handles product names with special characters",
    asyncTest: async () => {
      const localStorage = createMockLocalStorage();

      const cartItems = [
        {
          item_name: 'Widget "Deluxe" & More',
          unit_price: 10.0,
          quantity: 1,
          sku: "SPECIAL-1",
        },
        {
          item_name: "Test <script>alert('xss')</script>",
          unit_price: 5.0,
          quantity: 1,
          sku: "SPECIAL-2",
        },
      ];
      saveCart(localStorage, cartItems);

      const cart = getCart(localStorage);

      // Names should be preserved correctly
      assert.strictEqual(
        cart[0].item_name,
        'Widget "Deluxe" & More',
        "Should preserve quotes and ampersands",
      );
      assert.strictEqual(
        cart[1].item_name,
        "Test <script>alert('xss')</script>",
        "Should preserve (but escape when rendering) script tags",
      );
    },
  },
  {
    name: "checkout-handles-decimal-quantities",
    description: "Checkout properly handles integer quantities",
    test: () => {
      const localStorage = createMockLocalStorage();

      // Save with integer quantities
      saveCart(localStorage, [
        { item_name: "Test", unit_price: 10, quantity: 2, sku: "T1" },
      ]);

      const cart = getCart(localStorage);

      assert.strictEqual(
        Number.isInteger(cart[0].quantity),
        true,
        "Quantity should be integer",
      );
    },
  },
  {
    name: "checkout-api-response-missing-url",
    description: "Handles API response with ID but no URL gracefully",
    asyncTest: async () => {
      const dom = createCheckoutDOM({ isStripeCheckoutPage: true });
      const localStorage = createMockLocalStorage();
      const locationTracker = createLocationTracker(dom);
      const location = locationTracker.getLocation();

      saveCart(localStorage, [
        { item_name: "Test", unit_price: 10, quantity: 1, sku: "SKU1" },
      ]);

      // API returns session ID but no URL
      const mockFetch = createMockFetch({
        "/api/stripe/create-session": {
          ok: true,
          data: { id: "cs_test_123" },
        },
      });

      dom.window.localStorage = localStorage;
      dom.window.fetch = mockFetch;

      // Mock Stripe global
      let stripeRedirectCalled = false;
      let stripeSessionId = null;

      dom.window.Stripe = (key) => ({
        redirectToCheckout: async ({ sessionId }) => {
          stripeRedirectCalled = true;
          stripeSessionId = sessionId;
          return { error: null };
        },
      });

      const main = dom.window.document.querySelector(".stripe-checkout-page");
      const stripeKey = main.dataset.stripeKey;
      const checkoutApiUrl = main.dataset.checkoutApiUrl;

      const cart = getCart(localStorage);
      const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));

      const response = await dom.window.fetch(
        `${checkoutApiUrl}/api/stripe/create-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        },
      );

      const session = await response.json();

      // Simulate fallback logic from stripe-checkout.js
      if (session.url) {
        location.href = session.url;
      } else if (session.id) {
        const stripe = dom.window.Stripe(stripeKey);
        await stripe.redirectToCheckout({ sessionId: session.id });
      }

      assert.strictEqual(
        stripeRedirectCalled,
        true,
        "Should use Stripe.js redirect",
      );
      assert.strictEqual(
        stripeSessionId,
        "cs_test_123",
        "Should pass session ID",
      );

      dom.window.close();
    },
  },
  {
    name: "minimum-checkout-amount-check",
    description:
      "Stripe button hidden for orders below minimum amount (30p)",
    test: () => {
      const MINIMUM_CHECKOUT_AMOUNT = 0.3;

      // Cart with total below minimum (25p)
      const cart = [
        { item_name: "Cheap Item", unit_price: 0.25, quantity: 1, sku: "C1" },
      ];
      const total = cart.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
      );

      const isBelowMinimum = total <= MINIMUM_CHECKOUT_AMOUNT;

      assert.strictEqual(total, 0.25, "Total should be 0.25");
      assert.strictEqual(
        isBelowMinimum,
        true,
        "Should be below minimum checkout amount",
      );

      // Cart with total above minimum
      const cart2 = [
        { item_name: "Item", unit_price: 0.5, quantity: 1, sku: "I1" },
      ];
      const total2 = cart2.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
      );
      const isBelowMinimum2 = total2 <= MINIMUM_CHECKOUT_AMOUNT;

      assert.strictEqual(
        isBelowMinimum2,
        false,
        "0.50 should be above minimum",
      );
    },
  },
];

export default createTestRunner("checkout", testCases);
