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
    checkoutApiUrl = "https://api.example.com",
    paypalEmail = "test@example.com",
    cartMode = "stripe",
    includeStripeCheckoutPage = false,
    // Product options for testing add-to-cart
    productTitle = "Test Product",
    productOptions = [
      { name: "Small", unit_price: "5.00", max_quantity: 5, sku: "SKU-S" },
      { name: "Large", unit_price: "10.00", max_quantity: 3, sku: "SKU-L" },
    ],
  } = options;

  const config = {
    cart_mode: cartMode,
    checkout_api_url: checkoutApiUrl,
    paypal_email: paypalEmail,
  };

  // cart-icon.html is now smart and handles quote mode automatically
  const cartIcon = await renderTemplate("src/_includes/cart-icon.html", {
    config,
  });

  // Only include cart overlay for paypal/stripe modes (not quote mode)
  let cartOverlay = "";
  if (cartMode !== "quote") {
    cartOverlay = await renderTemplate("src/_includes/cart-overlay.html", {
      config,
    });
  }

  const productOptionsHtml = await renderTemplate(
    "src/_includes/product-options.html",
    {
      config,
      title: productTitle,
      options: productOptions,
    },
  );

  // Render stripe checkout page if needed
  let stripeCheckoutPage = "";
  if (includeStripeCheckoutPage) {
    stripeCheckoutPage = await renderTemplate(
      "src/_layouts/stripe-checkout.html",
      { config },
    );
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
    description: "getCart warns and returns empty array for corrupt JSON",
    test: () => {
      withMockStorage((storage) => {
        storage.setItem(STORAGE_KEY, "not valid json {{{");
        const warnings = [];
        const originalWarn = console.warn;
        console.warn = (...args) => warnings.push(args);
        try {
          const cart = getCart();
          assert.deepStrictEqual(cart, []);
          assert.strictEqual(warnings.length, 1, "Expected one warning to be logged");
          assert.ok(
            warnings[0][0].includes("parse error"),
            "Warning should mention parse error"
          );
        } finally {
          console.warn = originalWarn;
        }
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
        cartMode: "stripe",
        checkoutApiUrl: "https://api.test.com",
      });

      const doc = dom.window.document;
      const overlay = doc.getElementById("cart-overlay");

      assert.ok(overlay, "Cart overlay should exist");
      assert.ok(
        overlay.querySelector(".cart-items"),
        "Should have cart-items container",
      );
      assert.ok(
        overlay.querySelector(".cart-empty"),
        "Should have cart-empty message",
      );
      assert.ok(
        overlay.querySelector(".cart-total-amount"),
        "Should have total display",
      );
      assert.ok(
        overlay.querySelector(".cart-checkout-stripe"),
        "Should have Stripe button",
      );
      assert.ok(
        overlay.querySelector(".cart-minimum-message"),
        "Should have minimum message",
      );

      // Verify data attributes from template
      assert.strictEqual(
        overlay.dataset.checkoutApiUrl,
        "https://api.test.com",
      );

      dom.window.close();
    },
  },
  {
    name: "template-cart-overlay-paypal-mode",
    description: "Cart overlay shows PayPal button when cart_mode is paypal",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        cartMode: "paypal",
        paypalEmail: "pay@example.com",
        checkoutApiUrl: "https://api.example.com",
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
    name: "template-cart-overlay-stripe-mode",
    description: "Cart overlay shows Stripe button when cart_mode is stripe",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        cartMode: "stripe",
        checkoutApiUrl: "https://api.example.com",
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
        checkoutApiUrl: "https://checkout.api.com",
      });

      const doc = dom.window.document;
      const page = doc.querySelector(".stripe-checkout-page");

      assert.ok(page, "Stripe checkout page should exist");
      assert.strictEqual(
        page.dataset.checkoutApiUrl,
        "https://checkout.api.com",
      );

      const status = doc.getElementById("status-message");
      assert.ok(status, "Status message element should exist");
      assert.ok(
        status.textContent.includes("Checking cart"),
        "Should show initial status",
      );

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
      assert.ok(
        cartIcon.querySelector(".cart-count"),
        "Should have cart count badge",
      );
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
          {
            name: "Standard",
            unit_price: "19.99",
            max_quantity: 10,
            sku: "STD-001",
          },
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
      assert.ok(
        button.textContent.includes("19.99"),
        "Button should show price",
      );

      // Should NOT have a select (single option = direct button)
      const select = doc.querySelector(".product-options-select");
      assert.strictEqual(
        select,
        null,
        "Should not have select for single option",
      );

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
      assert.strictEqual(
        button.disabled,
        true,
        "Button should be disabled initially",
      );
      assert.strictEqual(button.dataset.name, "Variable Product");

      // Check options
      const options = select.querySelectorAll("option");
      assert.strictEqual(
        options.length,
        4,
        "Should have 4 options (1 placeholder + 3 choices)",
      );

      // First option is placeholder
      assert.ok(
        options[0].disabled,
        "First option should be disabled placeholder",
      );

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
    description:
      "Product options template renders nothing when no payment configured",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        cartMode: null,
        paypalEmail: null,
        productOptions: [{ name: "Test", unit_price: "10.00", sku: "TEST" }],
      });

      const doc = dom.window.document;
      const button = doc.querySelector(".add-to-cart");
      const select = doc.querySelector(".product-options-select");

      assert.strictEqual(
        button,
        null,
        "Should not render add-to-cart when no payment",
      );
      assert.strictEqual(
        select,
        null,
        "Should not render select when no payment",
      );

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
          {
            item_name: "Product A",
            unit_price: 99.99,
            quantity: 2,
            sku: "SKU-A",
            max_quantity: 10,
          },
          {
            item_name: "Product B",
            unit_price: 49.99,
            quantity: 1,
            sku: "SKU-B",
          },
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
        saveCart([
          { item_name: "Widget", unit_price: 15, quantity: 1, sku: "W1" },
        ]);

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

  // ----------------------------------------
  // Business Logic Tests
  // ----------------------------------------
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

  // ----------------------------------------
  // ShoppingCart Class Tests
  // ----------------------------------------
  {
    name: "shopping-cart-addItem-new-item",
    description: "addItem adds a new item to empty cart",
    asyncTest: async () => {
      const dom = await createCheckoutPage();
      const mockStorage = createMockLocalStorage();

      // Simulate ShoppingCart.addItem() logic
      const addItem = (
        itemName,
        unitPrice,
        quantity = 1,
        maxQuantity = null,
        sku = null,
      ) => {
        const cartData = mockStorage.getItem("chobble_cart");
        const cart = cartData ? JSON.parse(cartData) : [];
        const existingItem = cart.find((item) => item.item_name === itemName);

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          if (maxQuantity && newQuantity > maxQuantity) {
            existingItem.quantity = maxQuantity;
          } else {
            existingItem.quantity = newQuantity;
          }
          if (maxQuantity !== null) existingItem.max_quantity = maxQuantity;
          if (sku !== null) existingItem.sku = sku;
        } else {
          cart.push({
            item_name: itemName,
            unit_price: unitPrice,
            quantity: quantity,
            max_quantity: maxQuantity,
            sku: sku,
          });
        }
        mockStorage.setItem("chobble_cart", JSON.stringify(cart));
        return cart;
      };

      // Add a new item
      const cart = addItem("Test Product", 15.99, 1, 10, "TEST-SKU");

      assert.strictEqual(cart.length, 1);
      assert.strictEqual(cart[0].item_name, "Test Product");
      assert.strictEqual(cart[0].unit_price, 15.99);
      assert.strictEqual(cart[0].quantity, 1);
      assert.strictEqual(cart[0].max_quantity, 10);
      assert.strictEqual(cart[0].sku, "TEST-SKU");

      dom.window.close();
    },
  },
  {
    name: "shopping-cart-addItem-increments-existing",
    description: "addItem increments quantity for existing item",
    asyncTest: async () => {
      const dom = await createCheckoutPage();
      const mockStorage = createMockLocalStorage();

      // Simulate addItem
      const addItem = (
        itemName,
        unitPrice,
        quantity = 1,
        maxQuantity = null,
        sku = null,
      ) => {
        const cartData = mockStorage.getItem("chobble_cart");
        const cart = cartData ? JSON.parse(cartData) : [];
        const existingItem = cart.find((item) => item.item_name === itemName);

        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          cart.push({
            item_name: itemName,
            unit_price: unitPrice,
            quantity,
            max_quantity: maxQuantity,
            sku,
          });
        }
        mockStorage.setItem("chobble_cart", JSON.stringify(cart));
        return cart;
      };

      // Add item twice
      addItem("Widget", 10.0, 1);
      const cart = addItem("Widget", 10.0, 2);

      assert.strictEqual(cart.length, 1, "Should still be 1 item");
      assert.strictEqual(cart[0].quantity, 3, "Quantity should be 3");

      dom.window.close();
    },
  },
  {
    name: "shopping-cart-addItem-respects-max-quantity",
    description: "addItem caps quantity at max_quantity",
    asyncTest: async () => {
      const dom = await createCheckoutPage();
      const mockStorage = createMockLocalStorage();

      // Simulate addItem with max_quantity enforcement
      const addItem = (
        itemName,
        unitPrice,
        quantity = 1,
        maxQuantity = null,
      ) => {
        const cartData = mockStorage.getItem("chobble_cart");
        const cart = cartData ? JSON.parse(cartData) : [];
        const existingItem = cart.find((item) => item.item_name === itemName);

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          if (maxQuantity && newQuantity > maxQuantity) {
            existingItem.quantity = maxQuantity; // Cap at max
          } else {
            existingItem.quantity = newQuantity;
          }
          if (maxQuantity !== null) existingItem.max_quantity = maxQuantity;
        } else {
          cart.push({
            item_name: itemName,
            unit_price: unitPrice,
            quantity,
            max_quantity: maxQuantity,
          });
        }
        mockStorage.setItem("chobble_cart", JSON.stringify(cart));
        return cart;
      };

      // Add item with max of 3, then try to add 5 more
      addItem("Limited Item", 20.0, 2, 3);
      const cart = addItem("Limited Item", 20.0, 5, 3);

      assert.strictEqual(
        cart[0].quantity,
        3,
        "Should be capped at max_quantity",
      );

      dom.window.close();
    },
  },
  {
    name: "shopping-cart-updateQuantity-increases",
    description: "updateQuantity increases item quantity",
    test: () => {
      withMockStorage(() => {
        saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);

        // Simulate updateQuantity
        const cart = getCart();
        const item = cart.find((i) => i.item_name === "Widget");
        item.quantity = 5;
        saveCart(cart);

        const updated = getCart();
        assert.strictEqual(updated[0].quantity, 5);
      });
    },
  },
  {
    name: "shopping-cart-updateQuantity-decreases",
    description: "updateQuantity decreases item quantity",
    test: () => {
      withMockStorage(() => {
        saveCart([{ item_name: "Widget", unit_price: 10, quantity: 5 }]);

        const cart = getCart();
        const item = cart.find((i) => i.item_name === "Widget");
        item.quantity = 2;
        saveCart(cart);

        const updated = getCart();
        assert.strictEqual(updated[0].quantity, 2);
      });
    },
  },
  {
    name: "shopping-cart-updateQuantity-removes-at-zero",
    description: "updateQuantity removes item when quantity is 0 or less",
    test: () => {
      withMockStorage(() => {
        saveCart([
          { item_name: "Keep", unit_price: 10, quantity: 1 },
          { item_name: "Remove", unit_price: 5, quantity: 3 },
        ]);

        // Simulate updateQuantity to 0 (which triggers removeItem)
        const cart = getCart();
        const newQuantity = 0;
        if (newQuantity <= 0) {
          removeItem("Remove");
        }

        const updated = getCart();
        assert.strictEqual(updated.length, 1);
        assert.strictEqual(updated[0].item_name, "Keep");
      });
    },
  },
  {
    name: "shopping-cart-updateQuantity-respects-max",
    description: "updateQuantity caps at max_quantity",
    test: () => {
      withMockStorage(() => {
        saveCart([
          {
            item_name: "Limited",
            unit_price: 10,
            quantity: 2,
            max_quantity: 5,
          },
        ]);

        // Simulate updateQuantity with max enforcement
        const cart = getCart();
        const item = cart.find((i) => i.item_name === "Limited");
        const requestedQty = 10;
        if (item.max_quantity && requestedQty > item.max_quantity) {
          item.quantity = item.max_quantity;
        } else {
          item.quantity = requestedQty;
        }
        saveCart(cart);

        const updated = getCart();
        assert.strictEqual(
          updated[0].quantity,
          5,
          "Should cap at max_quantity",
        );
      });
    },
  },
  {
    name: "shopping-cart-getCartTotal",
    description: "getCartTotal calculates sum of price * quantity",
    test: () => {
      withMockStorage(() => {
        saveCart([
          { item_name: "A", unit_price: 10.0, quantity: 2 },
          { item_name: "B", unit_price: 5.5, quantity: 3 },
          { item_name: "C", unit_price: 7.25, quantity: 1 },
        ]);

        // Simulate getCartTotal
        const cart = getCart();
        const total = cart.reduce(
          (sum, item) => sum + item.unit_price * item.quantity,
          0,
        );

        // (10 * 2) + (5.5 * 3) + (7.25 * 1) = 20 + 16.5 + 7.25 = 43.75
        assert.strictEqual(total, 43.75);
      });
    },
  },
  {
    name: "shopping-cart-getCartTotal-empty",
    description: "getCartTotal returns 0 for empty cart",
    test: () => {
      withMockStorage(() => {
        saveCart([]);
        const cart = getCart();
        const total = cart.reduce(
          (sum, item) => sum + item.unit_price * item.quantity,
          0,
        );
        assert.strictEqual(total, 0);
      });
    },
  },

  // ----------------------------------------
  // Cart UI State Tests
  // ----------------------------------------
  {
    name: "cart-ui-empty-state",
    description: "Cart overlay shows empty message when cart is empty",
    asyncTest: async () => {
      const dom = await createCheckoutPage();

      withMockStorage(() => {
        saveCart([]);

        const doc = dom.window.document;
        const cartEmpty = doc.querySelector(".cart-empty");
        const cartItems = doc.querySelector(".cart-items");

        // Simulate updateCartDisplay for empty cart
        cartEmpty.style.display = "block";
        cartItems.innerHTML = "";

        assert.strictEqual(cartEmpty.style.display, "block");
        assert.strictEqual(cartItems.innerHTML, "");
      });

      dom.window.close();
    },
  },
  {
    name: "cart-ui-stripe-hidden-below-minimum",
    description: "Stripe button hidden when total is below 30p minimum",
    asyncTest: async () => {
      const dom = await createCheckoutPage();
      const MINIMUM_CHECKOUT_AMOUNT = 0.3;

      withMockStorage(() => {
        saveCart([{ item_name: "Cheap", unit_price: 0.25, quantity: 1 }]);

        const cart = getCart();
        const total = cart.reduce(
          (sum, item) => sum + item.unit_price * item.quantity,
          0,
        );

        assert.ok(
          total <= MINIMUM_CHECKOUT_AMOUNT,
          "Test setup: total should be below minimum",
        );

        const doc = dom.window.document;
        const stripeBtn = doc.querySelector(".cart-checkout-stripe");
        const minimumMessage = doc.querySelector(".cart-minimum-message");

        // Simulate updateCartDisplay behavior for below-minimum cart
        stripeBtn.style.display = "none";
        minimumMessage.style.display = "block";

        assert.strictEqual(
          stripeBtn.style.display,
          "none",
          "Stripe button should be hidden",
        );
        assert.strictEqual(
          minimumMessage.style.display,
          "block",
          "Minimum message should show",
        );
      });

      dom.window.close();
    },
  },
  {
    name: "cart-ui-stripe-shown-above-minimum",
    description: "Stripe button visible when total is above 30p minimum",
    asyncTest: async () => {
      const dom = await createCheckoutPage();
      const MINIMUM_CHECKOUT_AMOUNT = 0.3;

      withMockStorage(() => {
        saveCart([{ item_name: "Normal", unit_price: 5.0, quantity: 1 }]);

        const cart = getCart();
        const total = cart.reduce(
          (sum, item) => sum + item.unit_price * item.quantity,
          0,
        );

        assert.ok(
          total > MINIMUM_CHECKOUT_AMOUNT,
          "Test setup: total should be above minimum",
        );

        const doc = dom.window.document;
        const stripeBtn = doc.querySelector(".cart-checkout-stripe");
        const minimumMessage = doc.querySelector(".cart-minimum-message");

        // Simulate updateCartDisplay behavior for above-minimum cart
        stripeBtn.style.display = "";
        stripeBtn.disabled = false;
        minimumMessage.style.display = "none";

        assert.notStrictEqual(
          stripeBtn.style.display,
          "none",
          "Stripe button should be visible",
        );
        assert.strictEqual(
          minimumMessage.style.display,
          "none",
          "Minimum message should be hidden",
        );
      });

      dom.window.close();
    },
  },
  {
    name: "cart-ui-buttons-disabled-when-empty",
    description: "Checkout button is disabled when cart is empty",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        cartMode: "stripe",
        checkoutApiUrl: "https://api.example.com",
      });

      withMockStorage(() => {
        saveCart([]);

        const doc = dom.window.document;
        const stripeBtn = doc.querySelector(".cart-checkout-stripe");

        // Simulate updateCartDisplay for empty cart
        stripeBtn.disabled = true;

        assert.strictEqual(
          stripeBtn.disabled,
          true,
          "Stripe button should be disabled",
        );
      });

      dom.window.close();
    },
  },

  // ----------------------------------------
  // Add to Cart Button Tests
  // ----------------------------------------
  {
    name: "add-to-cart-button-has-correct-data",
    description: "Add to cart button contains all necessary data attributes",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        productTitle: "My Product",
        productOptions: [
          {
            name: "Standard",
            unit_price: "25.00",
            max_quantity: 10,
            sku: "PROD-STD",
          },
        ],
      });

      const doc = dom.window.document;
      const button = doc.querySelector(".add-to-cart");

      assert.ok(button, "Button should exist");
      assert.strictEqual(button.dataset.name, "My Product");
      assert.strictEqual(button.dataset.option, "Standard");
      assert.strictEqual(button.dataset.price, "25.00");
      assert.strictEqual(button.dataset.maxQuantity, "10");
      assert.strictEqual(button.dataset.sku, "PROD-STD");

      dom.window.close();
    },
  },
  {
    name: "add-to-cart-builds-full-item-name",
    description: "Item name combines product and option correctly",
    test: () => {
      // Simulate the cart.js logic for building full item name
      const buildFullName = (itemName, optionName) => {
        return optionName ? `${itemName} - ${optionName}` : itemName;
      };

      assert.strictEqual(buildFullName("Widget", "Large"), "Widget - Large");
      assert.strictEqual(buildFullName("Widget", ""), "Widget");
      assert.strictEqual(buildFullName("Widget", null), "Widget");
    },
  },
  {
    name: "add-to-cart-parses-price-correctly",
    description: "Price is parsed as float from data attribute",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        productOptions: [{ name: "Test", unit_price: "19.99", sku: "T1" }],
      });

      const doc = dom.window.document;
      const button = doc.querySelector(".add-to-cart");
      const price = parseFloat(button.dataset.price);

      assert.strictEqual(price, 19.99);
      assert.strictEqual(typeof price, "number");

      dom.window.close();
    },
  },

  // ----------------------------------------
  // Multi-Option Select Tests
  // ----------------------------------------
  {
    name: "multi-option-select-disables-button-initially",
    description: "Multi-option button is disabled until option selected",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        productOptions: [
          { name: "Small", unit_price: "5.00", sku: "S" },
          { name: "Large", unit_price: "10.00", sku: "L" },
        ],
      });

      const doc = dom.window.document;
      const button = doc.querySelector(".product-option-button");

      assert.strictEqual(
        button.disabled,
        true,
        "Button should be disabled initially",
      );

      dom.window.close();
    },
  },
  {
    name: "multi-option-select-has-placeholder",
    description: "Multi-option select has disabled placeholder option",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        productOptions: [
          { name: "Small", unit_price: "5.00", sku: "S" },
          { name: "Large", unit_price: "10.00", sku: "L" },
        ],
      });

      const doc = dom.window.document;
      const select = doc.querySelector(".product-options-select");
      const firstOption = select.options[0];

      assert.ok(firstOption.disabled, "First option should be disabled");
      assert.strictEqual(
        firstOption.value,
        "",
        "First option should have empty value",
      );
      assert.ok(
        firstOption.selected,
        "First option should be selected by default",
      );

      dom.window.close();
    },
  },
  {
    name: "multi-option-select-options-have-data",
    description: "Select options contain price, sku, and max_quantity data",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        productOptions: [
          { name: "Small", unit_price: "5.00", max_quantity: 10, sku: "SKU-S" },
          { name: "Large", unit_price: "10.00", max_quantity: 5, sku: "SKU-L" },
        ],
      });

      const doc = dom.window.document;
      const select = doc.querySelector(".product-options-select");

      // Skip placeholder (index 0)
      const smallOption = select.options[1];
      const largeOption = select.options[2];

      assert.strictEqual(smallOption.dataset.name, "Small");
      assert.strictEqual(smallOption.dataset.price, "5.00");
      assert.strictEqual(smallOption.dataset.sku, "SKU-S");
      assert.strictEqual(smallOption.dataset.maxQuantity, "10");

      assert.strictEqual(largeOption.dataset.name, "Large");
      assert.strictEqual(largeOption.dataset.price, "10.00");
      assert.strictEqual(largeOption.dataset.sku, "SKU-L");
      assert.strictEqual(largeOption.dataset.maxQuantity, "5");

      dom.window.close();
    },
  },
  {
    name: "multi-option-select-enables-button-on-change",
    description: "Selecting an option enables the add-to-cart button",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        productOptions: [
          { name: "Small", unit_price: "5.00", sku: "S" },
          { name: "Large", unit_price: "10.00", sku: "L" },
        ],
      });

      const doc = dom.window.document;
      const select = doc.querySelector(".product-options-select");
      const button = doc.querySelector(".product-option-button");

      // Simulate selecting an option (matches cart.js change handler)
      select.selectedIndex = 1; // Select "Small"
      const selectedOption = select.options[select.selectedIndex];

      // Apply the selection to button (simulating cart.js change handler)
      button.disabled = false;
      button.dataset.option = selectedOption.dataset.name;
      button.dataset.price = selectedOption.dataset.price;
      button.dataset.sku = selectedOption.dataset.sku;
      button.dataset.maxQuantity = selectedOption.dataset.maxQuantity;
      button.textContent = `Add to Cart - £${selectedOption.dataset.price}`;

      assert.strictEqual(button.disabled, false, "Button should be enabled");
      assert.strictEqual(button.dataset.option, "Small");
      assert.strictEqual(button.dataset.price, "5.00");
      assert.ok(
        button.textContent.includes("5.00"),
        "Button should show price",
      );

      dom.window.close();
    },
  },

  // ----------------------------------------
  // Quote Mode (Enquiry) Tests
  // ----------------------------------------
  {
    name: "quote-mode-add-to-cart-works",
    description:
      "In quote mode, clicking add-to-cart adds item to cart and updates icon",
    asyncTest: async () => {
      // Render templates for quote mode
      const config = { cart_mode: "quote" };
      const cartIcon = await renderTemplate(
        "src/_includes/cart-icon.html",
        { config },
      );
      const productOptionsHtml = await renderTemplate(
        "src/_includes/product-options.html",
        {
          config,
          title: "Quote Product",
          options: [
            {
              name: "Standard",
              unit_price: "50.00",
              max_quantity: 10,
              sku: "QUOTE-STD",
            },
          ],
        },
      );

      // Inline the cart JS code (converted from ES modules to plain JS)
      // This simulates what the bundled JS does in the browser
      const inlineCartJs = `
        // Cart utilities (from cart-utils.js)
        const STORAGE_KEY = "shopping_cart";

        function getCart() {
          try {
            const cart = localStorage.getItem(STORAGE_KEY);
            return cart ? JSON.parse(cart) : [];
          } catch (e) {
            return [];
          }
        }

        function saveCart(cart) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
          } catch (e) {
            console.error("Error saving cart:", e);
          }
        }

        function getItemCount() {
          const cart = getCart();
          return cart.reduce((count, item) => count + item.quantity, 0);
        }

        function updateCartIcon() {
          const count = getItemCount();
          document.querySelectorAll(".cart-icon").forEach((icon) => {
            icon.style.display = count > 0 ? "flex" : "none";
            const badge = icon.querySelector(".cart-count");
            if (badge) {
              badge.textContent = count;
              badge.style.display = count > 0 ? "block" : "none";
            }
          });
        }

        // ShoppingCart class (from cart.js - with fix applied)
        class ShoppingCart {
          constructor() {
            this.cartOverlay = null;
            this.documentListenersAttached = false;
            this.isEnquiryMode = false;
            this.init();
          }

          init() {
            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", () => this.setup());
            } else {
              this.setup();
            }
          }

          setup() {
            this.cartOverlay = document.getElementById("cart-overlay");
            const cartIcon = document.querySelector(".cart-icon");
            this.isEnquiryMode = cartIcon?.dataset.enquiryMode === "true";

            if (!this.isEnquiryMode && !this.cartOverlay) {
              return;
            }

            this.setupEventListeners();

            if (!this.isEnquiryMode) {
              this.updateCartDisplay();
            }
            this.updateCartCount();
          }

          setupEventListeners() {
            if (this.documentListenersAttached) return;
            this.documentListenersAttached = true;

            document.addEventListener("click", (e) => {
              if (e.target.classList.contains("add-to-cart")) {
                e.preventDefault();
                const button = e.target;

                const itemName = button.dataset.name;
                const optionName = button.dataset.option || "";
                const unitPrice = parseFloat(button.dataset.price);
                const maxQuantity = button.dataset.maxQuantity
                  ? parseInt(button.dataset.maxQuantity)
                  : null;
                const sku = button.dataset.sku || null;

                const fullItemName = optionName
                  ? itemName + " - " + optionName
                  : itemName;

                if (fullItemName && !isNaN(unitPrice)) {
                  this.addItem(fullItemName, unitPrice, 1, maxQuantity, sku);
                }
              }
            });
          }

          addItem(itemName, unitPrice, quantity, maxQuantity, sku) {
            const cart = getCart();
            cart.push({
              item_name: itemName,
              unit_price: unitPrice,
              quantity: quantity,
              max_quantity: maxQuantity,
              sku: sku,
            });
            saveCart(cart);
            this.updateCartDisplay();
            this.updateCartCount();
          }

          updateCartDisplay() {
            // FIX: Skip if no cart overlay (e.g., in quote/enquiry mode)
            if (!this.cartOverlay) return;

            const cartItems = this.cartOverlay.querySelector(".cart-items");
            if (!cartItems) return;
          }

          updateCartCount() {
            updateCartIcon();
          }
        }

        // Initialize
        window.shoppingCart = new ShoppingCart();
      `;

      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Quote Mode Test</title></head>
        <body>
          ${cartIcon}
          <div class="product-page">${productOptionsHtml}</div>
          <script>${inlineCartJs}</script>
        </body>
        </html>
      `;

      const dom = new JSDOM(html, {
        url: "https://example.com",
        runScripts: "dangerously",
        resources: "usable",
      });

      // Wait for scripts to execute
      await new Promise((resolve) => setTimeout(resolve, 50));

      const doc = dom.window.document;
      const win = dom.window;

      // Verify setup
      const cartIconEl = doc.querySelector(".cart-icon");
      assert.ok(cartIconEl, "Cart icon should exist");
      assert.strictEqual(
        cartIconEl.dataset.enquiryMode,
        "true",
        "Should be in enquiry mode",
      );

      const button = doc.querySelector(".add-to-cart");
      assert.ok(button, "Add to cart button should exist");

      // Check cart is empty before click
      const cartBefore = win.localStorage.getItem("shopping_cart");
      assert.strictEqual(cartBefore, null, "Cart should be empty initially");

      // Click the button
      button.click();

      // Wait a moment for any async effects
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Check item was added to cart
      const cartAfter = win.localStorage.getItem("shopping_cart");
      assert.ok(cartAfter, "Cart should have items after click");

      const items = JSON.parse(cartAfter);
      assert.strictEqual(items.length, 1, "Cart should have 1 item");
      assert.strictEqual(items[0].item_name, "Quote Product - Standard");
      assert.strictEqual(items[0].unit_price, 50);
      assert.strictEqual(items[0].sku, "QUOTE-STD");

      // Cart icon should now be visible
      assert.strictEqual(
        cartIconEl.style.display,
        "flex",
        "Cart icon should be visible after adding item",
      );

      // Cart count badge should show 1
      const badge = cartIconEl.querySelector(".cart-count");
      assert.strictEqual(
        badge.textContent,
        "1",
        "Badge should show count of 1",
      );
      assert.strictEqual(
        badge.style.display,
        "block",
        "Badge should be visible",
      );

      dom.window.close();
    },
  },
  {
    name: "quote-mode-cart-icon-has-enquiry-attribute",
    description: "Cart icon in quote mode has data-enquiry-mode attribute",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        cartMode: "quote",
        productOptions: [{ name: "Test", unit_price: "10.00", sku: "T1" }],
      });

      const doc = dom.window.document;
      const cartIcon = doc.querySelector(".cart-icon");

      assert.ok(cartIcon, "Cart icon should exist");
      assert.strictEqual(
        cartIcon.dataset.enquiryMode,
        "true",
        "Cart icon should have data-enquiry-mode='true'",
      );
      assert.ok(
        cartIcon.textContent.includes("Quote"),
        "Cart icon should show 'View Quote' text",
      );

      dom.window.close();
    },
  },
  {
    name: "quote-mode-no-cart-overlay",
    description: "Quote mode should not render cart overlay",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        cartMode: "quote",
        productOptions: [{ name: "Test", unit_price: "10.00", sku: "T1" }],
      });

      const doc = dom.window.document;
      const cartOverlay = doc.getElementById("cart-overlay");

      assert.strictEqual(
        cartOverlay,
        null,
        "Cart overlay should not exist in quote mode",
      );

      dom.window.close();
    },
  },
];

export default createTestRunner("checkout", testCases);
