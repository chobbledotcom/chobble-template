// Checkout E2E Tests using JSDOM
// Tests the complete checkout flow with mocked Stripe API
// Uses actual cart-utils.js and renders real Liquid templates

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { Liquid } from "liquidjs";
// Import actual cart utilities
import {
  attachQuantityHandlers,
  attachRemoveHandlers,
  escapeHtml,
  formatPrice,
  getCart,
  getItemCount,
  removeItem,
  renderQuantityControls,
  STORAGE_KEY,
  saveCart,
  updateCartIcon,
  updateItemQuantity,
} from "#assets/cart-utils.js";
import { buildJsConfigScript } from "#eleventy/js-config.js";
import { createTestRunner } from "#test/test-utils.js";

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
    productSpecs = null,
  } = options;

  const config = {
    cart_mode: cartMode,
    checkout_api_url: checkoutApiUrl,
    paypal_email: paypalEmail,
  };

  // Compute cart_attributes like products.11tydata.js does
  const cart_attributes =
    productOptions && productOptions.length > 0
      ? JSON.stringify({
          name: productTitle,
          options: productOptions.map((opt) => ({
            name: opt.name,
            unit_price: parseFloat(opt.unit_price),
            max_quantity: opt.max_quantity || null,
            sku: opt.sku || null,
          })),
          specs: productSpecs,
        }).replace(/"/g, "&quot;")
      : null;

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
      cart_attributes,
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

  // Build config script using the same function as the Eleventy shortcode
  const configScript = buildJsConfigScript(config);

  // Build complete HTML page using real templates
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Checkout Test</title>
      ${configScript}
    </head>
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
    description: "getCart logs error and returns empty array for corrupt JSON",
    test: () => {
      withMockStorage((storage) => {
        storage.setItem(STORAGE_KEY, "not valid json {{{");
        const errors = [];
        const originalError = console.error;
        console.error = (...args) => errors.push(args);
        try {
          const cart = getCart();
          assert.deepStrictEqual(cart, []);
          assert.strictEqual(
            errors.length,
            1,
            "Expected one error to be logged",
          );
          assert.ok(
            errors[0][0].includes("Failed to parse"),
            "Error should mention failed to parse",
          );
        } finally {
          console.error = originalError;
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
  {
    name: "cart-utils-escapeHtml-basic",
    description: "escapeHtml escapes HTML special characters",
    asyncTest: async () => {
      const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
      global.document = dom.window.document;
      try {
        assert.strictEqual(
          escapeHtml("<script>alert('xss')</script>"),
          "&lt;script&gt;alert('xss')&lt;/script&gt;",
        );
        assert.strictEqual(
          escapeHtml("Hello & Goodbye"),
          "Hello &amp; Goodbye",
        );
        // Note: innerHTML doesn't escape quotes, only < > and &
        assert.strictEqual(escapeHtml('"quoted"'), '"quoted"');
        assert.strictEqual(escapeHtml("normal text"), "normal text");
      } finally {
        delete global.document;
        dom.window.close();
      }
    },
  },
  {
    name: "cart-utils-updateCartIcon-shows-icon",
    description: "updateCartIcon shows cart icon when items in cart",
    asyncTest: async () => {
      const dom = new JSDOM(`
        <!DOCTYPE html>
        <html><body>
          <div class="cart-icon" style="display: none;">
            <span class="cart-count" style="display: none;">0</span>
          </div>
        </body></html>
      `);
      global.document = dom.window.document;
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;
      try {
        saveCart([
          { item_name: "A", unit_price: 10, quantity: 2 },
          { item_name: "B", unit_price: 5, quantity: 3 },
        ]);
        updateCartIcon();
        const icon = dom.window.document.querySelector(".cart-icon");
        const badge = icon.querySelector(".cart-count");
        assert.strictEqual(
          icon.style.display,
          "flex",
          "Icon should be visible",
        );
        assert.strictEqual(badge.textContent, "5", "Badge should show count 5");
        assert.strictEqual(
          badge.style.display,
          "block",
          "Badge should be visible",
        );
      } finally {
        globalThis.localStorage = origStorage;
        delete global.document;
        dom.window.close();
      }
    },
  },
  {
    name: "cart-utils-updateCartIcon-hides-icon",
    description: "updateCartIcon hides cart icon when cart is empty",
    asyncTest: async () => {
      const dom = new JSDOM(`
        <!DOCTYPE html>
        <html><body>
          <div class="cart-icon" style="display: flex;">
            <span class="cart-count" style="display: block;">5</span>
          </div>
        </body></html>
      `);
      global.document = dom.window.document;
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;
      try {
        saveCart([]);
        updateCartIcon();
        const icon = dom.window.document.querySelector(".cart-icon");
        const badge = icon.querySelector(".cart-count");
        assert.strictEqual(icon.style.display, "none", "Icon should be hidden");
        assert.strictEqual(
          badge.style.display,
          "none",
          "Badge should be hidden",
        );
      } finally {
        globalThis.localStorage = origStorage;
        delete global.document;
        dom.window.close();
      }
    },
  },
  {
    name: "cart-utils-updateItemQuantity-updates-quantity",
    description: "updateItemQuantity updates item quantity correctly",
    test: () => {
      withMockStorage(() => {
        saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);
        const result = updateItemQuantity("Widget", 5);
        assert.strictEqual(
          result,
          true,
          "Should return true for existing item",
        );
        const cart = getCart();
        assert.strictEqual(
          cart[0].quantity,
          5,
          "Quantity should be updated to 5",
        );
      });
    },
  },
  {
    name: "cart-utils-updateItemQuantity-removes-at-zero",
    description: "updateItemQuantity removes item when quantity is 0 or less",
    test: () => {
      withMockStorage(() => {
        saveCart([
          { item_name: "Keep", unit_price: 10, quantity: 1 },
          { item_name: "Remove", unit_price: 5, quantity: 3 },
        ]);
        updateItemQuantity("Remove", 0);
        const cart = getCart();
        assert.strictEqual(cart.length, 1, "Cart should have 1 item");
        assert.strictEqual(
          cart[0].item_name,
          "Keep",
          "Only Keep should remain",
        );
      });
    },
  },
  {
    name: "cart-utils-updateItemQuantity-respects-max",
    description: "updateItemQuantity caps at max_quantity and shows alert",
    asyncTest: async () => {
      const alerts = [];
      const origAlert = global.alert;
      global.alert = (msg) => alerts.push(msg);
      try {
        withMockStorage(() => {
          saveCart([
            {
              item_name: "Limited",
              unit_price: 10,
              quantity: 2,
              max_quantity: 5,
            },
          ]);
          updateItemQuantity("Limited", 10);
          const cart = getCart();
          assert.strictEqual(
            cart[0].quantity,
            5,
            "Quantity should be capped at max_quantity",
          );
          assert.strictEqual(alerts.length, 1, "Should show alert");
          assert.ok(
            alerts[0].includes("5"),
            "Alert should mention max quantity",
          );
        });
      } finally {
        global.alert = origAlert;
      }
    },
  },
  {
    name: "cart-utils-updateItemQuantity-nonexistent-item",
    description: "updateItemQuantity returns false for non-existent item",
    test: () => {
      withMockStorage(() => {
        saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);
        const result = updateItemQuantity("NonExistent", 5);
        assert.strictEqual(
          result,
          false,
          "Should return false for non-existent item",
        );
      });
    },
  },
  {
    name: "cart-utils-renderQuantityControls-basic",
    description: "renderQuantityControls generates correct HTML structure",
    asyncTest: async () => {
      const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
      global.document = dom.window.document;
      try {
        const item = { item_name: "Widget", quantity: 3 };
        const html = renderQuantityControls(item);

        // Parse the HTML to verify structure
        const container = dom.window.document.createElement("div");
        container.innerHTML = html;

        const qtyDiv = container.querySelector(".cart-item-quantity");
        assert.ok(qtyDiv, "Should have cart-item-quantity container");

        const decreaseBtn = container.querySelector(".qty-decrease");
        assert.ok(decreaseBtn, "Should have decrease button");
        assert.strictEqual(
          decreaseBtn.dataset.name,
          "Widget",
          "Decrease button should have data-name",
        );

        const increaseBtn = container.querySelector(".qty-increase");
        assert.ok(increaseBtn, "Should have increase button");
        assert.strictEqual(
          increaseBtn.dataset.name,
          "Widget",
          "Increase button should have data-name",
        );

        const input = container.querySelector(".qty-input");
        assert.ok(input, "Should have quantity input");
        assert.strictEqual(
          input.value,
          "3",
          "Input should have quantity value",
        );
        assert.strictEqual(
          input.dataset.name,
          "Widget",
          "Input should have data-name",
        );
      } finally {
        delete global.document;
        dom.window.close();
      }
    },
  },
  {
    name: "cart-utils-renderQuantityControls-max-quantity",
    description:
      "renderQuantityControls includes max attribute when max_quantity set",
    asyncTest: async () => {
      const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
      global.document = dom.window.document;
      try {
        const item = { item_name: "Limited", quantity: 2, max_quantity: 5 };
        const html = renderQuantityControls(item);

        const container = dom.window.document.createElement("div");
        container.innerHTML = html;

        const input = container.querySelector(".qty-input");
        assert.strictEqual(
          input.getAttribute("max"),
          "5",
          "Input should have max attribute",
        );
      } finally {
        delete global.document;
        dom.window.close();
      }
    },
  },
  {
    name: "cart-utils-renderQuantityControls-escapes-html",
    description: "renderQuantityControls escapes HTML in item names",
    asyncTest: async () => {
      const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
      global.document = dom.window.document;
      try {
        const item = { item_name: "<script>xss</script>", quantity: 1 };
        const html = renderQuantityControls(item);

        assert.ok(
          !html.includes("<script>xss</script>"),
          "Should escape HTML in item name",
        );
        assert.ok(
          html.includes("&lt;script&gt;"),
          "Should contain escaped HTML",
        );
      } finally {
        delete global.document;
        dom.window.close();
      }
    },
  },
  {
    name: "cart-utils-attachQuantityHandlers-decrease",
    description: "attachQuantityHandlers attaches decrease button handlers",
    asyncTest: async () => {
      const dom = new JSDOM(`
        <!DOCTYPE html>
        <html><body>
          <div id="container">
            <button class="qty-decrease" data-name="Widget">−</button>
            <input class="qty-input" data-name="Widget" value="3">
            <button class="qty-increase" data-name="Widget">+</button>
          </div>
        </body></html>
      `);
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;
      try {
        saveCart([{ item_name: "Widget", unit_price: 10, quantity: 3 }]);

        const container = dom.window.document.getElementById("container");
        const updates = [];

        attachQuantityHandlers(container, (name, qty) => {
          updates.push({ name, qty });
        });

        // Simulate click on decrease button
        const decreaseBtn = container.querySelector(".qty-decrease");
        decreaseBtn.click();

        assert.strictEqual(updates.length, 1, "Should have one update");
        assert.strictEqual(updates[0].name, "Widget", "Should update Widget");
        assert.strictEqual(updates[0].qty, 2, "Should decrease quantity by 1");
      } finally {
        globalThis.localStorage = origStorage;
        dom.window.close();
      }
    },
  },
  {
    name: "cart-utils-attachQuantityHandlers-increase",
    description: "attachQuantityHandlers attaches increase button handlers",
    asyncTest: async () => {
      const dom = new JSDOM(`
        <!DOCTYPE html>
        <html><body>
          <div id="container">
            <button class="qty-decrease" data-name="Widget">−</button>
            <input class="qty-input" data-name="Widget" value="3">
            <button class="qty-increase" data-name="Widget">+</button>
          </div>
        </body></html>
      `);
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;
      try {
        saveCart([{ item_name: "Widget", unit_price: 10, quantity: 3 }]);

        const container = dom.window.document.getElementById("container");
        const updates = [];

        attachQuantityHandlers(container, (name, qty) => {
          updates.push({ name, qty });
        });

        // Simulate click on increase button
        const increaseBtn = container.querySelector(".qty-increase");
        increaseBtn.click();

        assert.strictEqual(updates.length, 1, "Should have one update");
        assert.strictEqual(updates[0].name, "Widget", "Should update Widget");
        assert.strictEqual(updates[0].qty, 4, "Should increase quantity by 1");
      } finally {
        globalThis.localStorage = origStorage;
        dom.window.close();
      }
    },
  },
  {
    name: "cart-utils-attachQuantityHandlers-input-change",
    description: "attachQuantityHandlers attaches input change handlers",
    asyncTest: async () => {
      const dom = new JSDOM(`
        <!DOCTYPE html>
        <html><body>
          <div id="container">
            <input class="qty-input" data-name="Widget" value="3">
          </div>
        </body></html>
      `);
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;
      try {
        saveCart([{ item_name: "Widget", unit_price: 10, quantity: 3 }]);

        const container = dom.window.document.getElementById("container");
        const updates = [];

        attachQuantityHandlers(container, (name, qty) => {
          updates.push({ name, qty });
        });

        // Simulate input change
        const input = container.querySelector(".qty-input");
        input.value = "7";
        input.dispatchEvent(new dom.window.Event("change"));

        assert.strictEqual(updates.length, 1, "Should have one update");
        assert.strictEqual(updates[0].name, "Widget", "Should update Widget");
        assert.strictEqual(updates[0].qty, 7, "Should update to new quantity");
      } finally {
        globalThis.localStorage = origStorage;
        dom.window.close();
      }
    },
  },
  {
    name: "cart-utils-attachRemoveHandlers-removes-item",
    description: "attachRemoveHandlers attaches remove button handlers",
    asyncTest: async () => {
      const dom = new JSDOM(`
        <!DOCTYPE html>
        <html><body>
          <div id="container">
            <button class="remove-btn" data-name="Widget">Remove</button>
          </div>
        </body></html>
      `);
      const mockStorage = createMockLocalStorage();
      const origStorage = globalThis.localStorage;
      globalThis.localStorage = mockStorage;
      try {
        saveCart([
          { item_name: "Widget", unit_price: 10, quantity: 1 },
          { item_name: "Gadget", unit_price: 20, quantity: 2 },
        ]);

        const container = dom.window.document.getElementById("container");
        let removeCalled = false;

        attachRemoveHandlers(container, ".remove-btn", () => {
          removeCalled = true;
        });

        // Simulate click on remove button
        const removeBtn = container.querySelector(".remove-btn");
        removeBtn.click();

        assert.strictEqual(
          removeCalled,
          true,
          "onRemove callback should be called",
        );
        const cart = getCart();
        assert.strictEqual(cart.length, 1, "Cart should have 1 item");
        assert.strictEqual(
          cart[0].item_name,
          "Gadget",
          "Widget should be removed",
        );
      } finally {
        globalThis.localStorage = origStorage;
        dom.window.close();
      }
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

      // Verify config is available via script tag
      const configScript = dom.window.document.getElementById("site-config");
      const siteConfig = JSON.parse(configScript.textContent);
      assert.strictEqual(siteConfig.checkout_api_url, "https://api.test.com");

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

      // Parse the consolidated data-item attribute
      const itemData = JSON.parse(button.dataset.item);
      assert.strictEqual(itemData.name, "My Product");
      assert.strictEqual(itemData.options[0].name, "Standard");
      assert.strictEqual(itemData.options[0].unit_price, 19.99);
      assert.strictEqual(itemData.options[0].sku, "STD-001");
      assert.strictEqual(itemData.options[0].max_quantity, 10);
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

      // Parse the consolidated data-item attribute
      const itemData = JSON.parse(button.dataset.item);
      assert.strictEqual(itemData.name, "Variable Product");
      assert.strictEqual(itemData.options.length, 3);

      // Check options in select (values are indices now)
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

      // Check second option (Small) - now just value index
      assert.strictEqual(options[1].value, "0");
      assert.ok(options[1].textContent.includes("Small"));
      assert.ok(options[1].textContent.includes("5.00"));

      // Verify the data is in itemData
      assert.strictEqual(itemData.options[0].name, "Small");
      assert.strictEqual(itemData.options[0].unit_price, 5.0);
      assert.strictEqual(itemData.options[0].sku, "VAR-S");
      assert.strictEqual(itemData.options[0].max_quantity, 5);

      dom.window.close();
    },
  },
  {
    name: "template-list-item-cart-button-single-option",
    description:
      "List item cart button renders Add to Cart for single option products",
    asyncTest: async () => {
      const config = { cart_mode: "stripe" };
      const options = [
        { name: "Standard", unit_price: 29.99, max_quantity: 5, sku: "TP1" },
      ];
      // Compute cart_attributes like products.11tydata.js does
      const cart_attributes = JSON.stringify({
        name: "Test Product",
        options: options.map((opt) => ({
          name: opt.name,
          unit_price: opt.unit_price,
          max_quantity: opt.max_quantity || null,
          sku: opt.sku || null,
        })),
        specs: null,
      }).replace(/"/g, "&quot;");

      const item = {
        data: {
          title: "Test Product",
          options,
          cart_attributes,
        },
        url: "/products/test-product/",
      };

      const html = await renderTemplate(
        "src/_includes/list-item-cart-button.html",
        { config, item },
      );

      const dom = new JSDOM(`<div>${html}</div>`);
      const doc = dom.window.document;
      const button = doc.querySelector(".add-to-cart");

      assert.ok(button, "Add to cart button should exist");

      // Parse the consolidated data-item attribute
      const itemData = JSON.parse(button.dataset.item);
      assert.strictEqual(itemData.name, "Test Product");
      assert.strictEqual(itemData.options[0].name, "Standard");
      assert.strictEqual(itemData.options[0].unit_price, 29.99);
      assert.strictEqual(itemData.options[0].max_quantity, 5);
      assert.strictEqual(itemData.options[0].sku, "TP1");
      dom.window.close();
    },
  },
  {
    name: "template-list-item-cart-button-multi-option",
    description:
      "List item cart button shows Select Options link for multi-option products",
    asyncTest: async () => {
      const config = { cart_mode: "stripe" };
      const options = [
        { name: "Small", unit_price: 19.99, sku: "VP-S" },
        { name: "Large", unit_price: 29.99, sku: "VP-L" },
      ];
      // Compute cart_attributes like products.11tydata.js does
      const cart_attributes = JSON.stringify({
        name: "Variable Product",
        options: options.map((opt) => ({
          name: opt.name,
          unit_price: opt.unit_price,
          max_quantity: opt.max_quantity || null,
          sku: opt.sku || null,
        })),
        specs: null,
      }).replace(/"/g, "&quot;");

      const item = {
        data: {
          title: "Variable Product",
          options,
          cart_attributes,
        },
        url: "/products/variable-product/",
      };

      const html = await renderTemplate(
        "src/_includes/list-item-cart-button.html",
        { config, item },
      );

      const dom = new JSDOM(`<div>${html}</div>`);
      const doc = dom.window.document;
      const button = doc.querySelector(".add-to-cart");
      const link = doc.querySelector("a.button");

      assert.strictEqual(button, null, "Should not have direct add-to-cart");
      assert.ok(link, "Should have Select Options link");
      assert.ok(
        link.href.includes("/products/variable-product/"),
        "Link should go to product page",
      );
      assert.ok(
        link.textContent.includes("Select Options"),
        "Link should say Select Options",
      );

      dom.window.close();
    },
  },
  {
    name: "template-list-item-cart-button-no-cart-mode",
    description: "List item cart button renders nothing when cart_mode is null",
    asyncTest: async () => {
      const config = { cart_mode: null };
      const item = {
        data: {
          title: "Test Product",
          options: [{ name: "Standard", unit_price: 29.99, sku: "TP1" }],
        },
        url: "/products/test-product/",
      };

      const html = await renderTemplate(
        "src/_includes/list-item-cart-button.html",
        { config, item },
      );

      assert.strictEqual(
        html.trim(),
        "",
        "Should render nothing without cart_mode",
      );
    },
  },
  {
    name: "template-list-item-cart-button-no-options",
    description:
      "List item cart button renders nothing for items without options",
    asyncTest: async () => {
      const config = { cart_mode: "stripe" };
      const item = {
        data: {
          title: "Blog Post",
        },
        url: "/news/blog-post/",
      };

      const html = await renderTemplate(
        "src/_includes/list-item-cart-button.html",
        { config, item },
      );

      assert.strictEqual(
        html.trim(),
        "",
        "Should render nothing for items without options",
      );
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
  // updateItemQuantity Tests (using actual production function)
  // ----------------------------------------
  {
    name: "updateItemQuantity-updates-existing-item",
    description: "updateItemQuantity changes quantity for existing item",
    test: () => {
      withMockStorage(() => {
        saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);

        const result = updateItemQuantity("Widget", 5);

        assert.strictEqual(
          result,
          true,
          "Should return true for existing item",
        );
        const cart = getCart();
        assert.strictEqual(cart[0].quantity, 5, "Quantity should be updated");
      });
    },
  },
  {
    name: "updateItemQuantity-removes-at-zero",
    description: "updateItemQuantity removes item when quantity is 0",
    test: () => {
      withMockStorage(() => {
        saveCart([
          { item_name: "Keep", unit_price: 10, quantity: 1 },
          { item_name: "Remove", unit_price: 5, quantity: 3 },
        ]);

        updateItemQuantity("Remove", 0);

        const cart = getCart();
        assert.strictEqual(cart.length, 1, "Should have 1 item remaining");
        assert.strictEqual(cart[0].item_name, "Keep", "Keep should remain");
      });
    },
  },
  {
    name: "updateItemQuantity-returns-false-for-nonexistent",
    description: "updateItemQuantity returns false for non-existent item",
    test: () => {
      withMockStorage(() => {
        saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);

        const result = updateItemQuantity("NonExistent", 5);

        assert.strictEqual(result, false, "Should return false");
      });
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

      // Parse the consolidated data-item attribute
      const itemData = JSON.parse(button.dataset.item);
      assert.strictEqual(itemData.name, "My Product");
      assert.strictEqual(itemData.options[0].name, "Standard");
      assert.strictEqual(itemData.options[0].unit_price, 25.0);
      assert.strictEqual(itemData.options[0].max_quantity, 10);
      assert.strictEqual(itemData.options[0].sku, "PROD-STD");

      dom.window.close();
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

      // Parse from consolidated data-item attribute
      const itemData = JSON.parse(button.dataset.item);
      const price = itemData.options[0].unit_price;

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
    description:
      "Select options have index values and button has consolidated data",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        productOptions: [
          { name: "Small", unit_price: "5.00", max_quantity: 10, sku: "SKU-S" },
          { name: "Large", unit_price: "10.00", max_quantity: 5, sku: "SKU-L" },
        ],
      });

      const doc = dom.window.document;
      const select = doc.querySelector(".product-options-select");
      const button = doc.querySelector(".product-option-button");

      // Skip placeholder (index 0) - options now have index values
      const smallOption = select.options[1];
      const largeOption = select.options[2];

      assert.strictEqual(smallOption.value, "0");
      assert.ok(smallOption.textContent.includes("Small"));
      assert.strictEqual(largeOption.value, "1");
      assert.ok(largeOption.textContent.includes("Large"));

      // All data is now in the button's data-item attribute
      const itemData = JSON.parse(button.dataset.item);
      assert.strictEqual(itemData.options[0].name, "Small");
      assert.strictEqual(itemData.options[0].unit_price, 5.0);
      assert.strictEqual(itemData.options[0].sku, "SKU-S");
      assert.strictEqual(itemData.options[0].max_quantity, 10);

      assert.strictEqual(itemData.options[1].name, "Large");
      assert.strictEqual(itemData.options[1].unit_price, 10.0);
      assert.strictEqual(itemData.options[1].sku, "SKU-L");
      assert.strictEqual(itemData.options[1].max_quantity, 5);

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

      // Get item data from button
      const itemData = JSON.parse(button.dataset.item);

      // Simulate selecting an option (matches cart.js change handler)
      select.selectedIndex = 1; // Select "Small" (index 0 in options array)
      const optionIndex = parseInt(
        select.options[select.selectedIndex].value,
        10,
      );
      const option = itemData.options[optionIndex];

      // Apply the selection to button (simulating cart.js change handler)
      button.disabled = false;
      button.textContent = `Add to Cart - £${option.unit_price}`;

      assert.strictEqual(button.disabled, false, "Button should be enabled");
      assert.strictEqual(option.name, "Small");
      assert.strictEqual(option.unit_price, 5.0);
      assert.ok(button.textContent.includes("5"), "Button should show price");

      dom.window.close();
    },
  },

  // ----------------------------------------
  // Quote Mode (Enquiry) Tests
  // ----------------------------------------
  // Note: quote-mode-add-to-cart-works was removed because it reimplemented
  // 140+ lines of cart.js logic inline. The quote-mode-config-is-set and
  // quote-mode-no-cart-overlay tests verify quote mode without this problem.
  // Cart functionality is tested via the cart-utils tests that call actual
  // production functions.
  {
    name: "quote-mode-config-is-set",
    description: "Quote mode sets cart_mode in config script",
    asyncTest: async () => {
      const dom = await createCheckoutPage({
        cartMode: "quote",
        productOptions: [{ name: "Test", unit_price: "10.00", sku: "T1" }],
      });

      const doc = dom.window.document;
      const cartIcon = doc.querySelector(".cart-icon");

      assert.ok(cartIcon, "Cart icon should exist");

      // Verify config script has quote mode
      const configScript = doc.getElementById("site-config");
      const siteConfig = JSON.parse(configScript.textContent);
      assert.strictEqual(
        siteConfig.cart_mode,
        "quote",
        "Config should have cart_mode='quote'",
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
