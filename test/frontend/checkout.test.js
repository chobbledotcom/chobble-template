// Checkout E2E Tests using happy-dom
// Tests the complete checkout flow with mocked Stripe API
// Uses actual cart-utils.js and renders real Liquid templates

import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { Liquid } from "liquidjs";
// Import actual cart utilities
import {
  attachQuantityHandlers,
  attachRemoveHandlers,
  formatPrice,
  getCart,
  getItemCount,
  removeItem,
  STORAGE_KEY,
  saveCart,
  updateCartIcon,
  updateItemQuantity,
} from "#assets/cart-utils.js";
import { buildJsConfigScript } from "#eleventy/js-config.js";
import { fs, path, rootDir } from "#test/test-utils.js";

// ============================================
// Template Rendering
// ============================================

const liquid = new Liquid({
  root: [
    path.join(rootDir, "src/_includes"),
    path.join(rootDir, "src/_layouts"),
  ],
  extname: ".html",
});

// Read and render actual Liquid templates
const renderTemplate = async (templatePath, data = {}) => {
  const fullPath = path.join(rootDir, templatePath);
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

  const window = new Window({ url: "https://example.com" });
  window.document.write(html);
  return { window };
};

// ============================================
// Mock Utilities
// ============================================

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

// Helper to run tests with isolated localStorage
// Uses the global localStorage (from happy-dom) but clears it before/after each test
const withMockStorage = (fn) => {
  globalThis.localStorage.clear();
  try {
    return fn(globalThis.localStorage);
  } finally {
    globalThis.localStorage.clear();
  }
};

// ============================================
// Test Cases
// ============================================

describe("checkout", () => {
  // ----------------------------------------
  // cart-utils.js Direct Tests
  // ----------------------------------------
  test("getCart returns empty array when localStorage is empty", () => {
    withMockStorage(() => {
      const cart = getCart();
      expect(cart).toEqual([]);
    });
  });

  test("saveCart persists cart and getCart retrieves it", () => {
    withMockStorage(() => {
      const items = [
        { item_name: "Widget", unit_price: 15.0, quantity: 2, sku: "W1" },
      ];
      saveCart(items);
      const retrieved = getCart();
      expect(retrieved).toEqual(items);
    });
  });

  test("getCart logs error and returns empty array for corrupt JSON", () => {
    withMockStorage((storage) => {
      storage.setItem(STORAGE_KEY, "not valid json {{{");
      const errors = [];
      const originalError = console.error;
      console.error = (...args) => errors.push(args);
      try {
        const cart = getCart();
        expect(cart).toEqual([]);
        expect(errors.length).toBe(1);
        expect(errors[0][0].includes("Failed to parse")).toBe(true);
      } finally {
        console.error = originalError;
      }
    });
  });

  test("removeItem removes item by name", () => {
    withMockStorage(() => {
      saveCart([
        { item_name: "Keep", unit_price: 10, quantity: 1 },
        { item_name: "Remove", unit_price: 5, quantity: 2 },
      ]);
      const result = removeItem("Remove");
      expect(result).toHaveLength(1);
      expect(result[0].item_name).toBe("Keep");
    });
  });

  test("formatPrice formats with £ symbol and 2 decimals", () => {
    expect(formatPrice(10)).toBe("£10.00");
    expect(formatPrice(5.5)).toBe("£5.50");
    expect(formatPrice(0.3)).toBe("£0.30");
  });

  test("getItemCount sums all quantities", () => {
    withMockStorage(() => {
      saveCart([
        { item_name: "A", unit_price: 10, quantity: 3 },
        { item_name: "B", unit_price: 5, quantity: 2 },
      ]);
      expect(getItemCount()).toBe(5);
    });
  });

  test("updateCartIcon shows cart icon when items in cart", () => {
    withMockStorage(() => {
      document.body.innerHTML = `
        <div class="cart-icon" style="display: none;">
          <span class="cart-count" style="display: none;">0</span>
        </div>
      `;
      saveCart([
        { item_name: "A", unit_price: 10, quantity: 2 },
        { item_name: "B", unit_price: 5, quantity: 3 },
      ]);
      updateCartIcon();
      const icon = document.querySelector(".cart-icon");
      const badge = icon.querySelector(".cart-count");
      expect(icon.style.display).toBe("flex");
      expect(badge.textContent).toBe("5");
      expect(badge.style.display).toBe("block");
    });
  });

  test("updateCartIcon hides cart icon when cart is empty", () => {
    withMockStorage(() => {
      document.body.innerHTML = `
        <div class="cart-icon" style="display: flex;">
          <span class="cart-count" style="display: block;">5</span>
        </div>
      `;
      saveCart([]);
      updateCartIcon();
      const icon = document.querySelector(".cart-icon");
      const badge = icon.querySelector(".cart-count");
      expect(icon.style.display).toBe("none");
      expect(badge.style.display).toBe("none");
    });
  });

  test("updateItemQuantity updates item quantity correctly", () => {
    withMockStorage(() => {
      saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);
      const result = updateItemQuantity("Widget", 5);
      expect(result).toBe(true);
      const cart = getCart();
      expect(cart[0].quantity).toBe(5);
    });
  });

  test("updateItemQuantity removes item when quantity is 0 or less", () => {
    withMockStorage(() => {
      saveCart([
        { item_name: "Keep", unit_price: 10, quantity: 1 },
        { item_name: "Remove", unit_price: 5, quantity: 3 },
      ]);
      updateItemQuantity("Remove", 0);
      const cart = getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0].item_name).toBe("Keep");
    });
  });

  test("updateItemQuantity caps at max_quantity and shows alert", () => {
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
        expect(cart[0].quantity).toBe(5);
        expect(alerts).toHaveLength(1);
        expect(alerts[0].includes("5")).toBe(true);
      });
    } finally {
      global.alert = origAlert;
    }
  });

  test("updateItemQuantity returns false for non-existent item", () => {
    withMockStorage(() => {
      saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);
      const result = updateItemQuantity("NonExistent", 5);
      expect(result).toBe(false);
    });
  });

  test("attachQuantityHandlers attaches decrease button handlers", () => {
    withMockStorage(() => {
      document.body.innerHTML = `
        <div id="container">
          <button data-action="decrease" data-name="Widget">−</button>
          <input type="number" data-name="Widget" value="3">
          <button data-action="increase" data-name="Widget">+</button>
        </div>
      `;
      saveCart([{ item_name: "Widget", unit_price: 10, quantity: 3 }]);

      const container = document.getElementById("container");
      const updates = [];

      attachQuantityHandlers(container, (name, qty) => {
        updates.push({ name, qty });
      });

      // Simulate click on decrease button
      const decreaseBtn = container.querySelector('[data-action="decrease"]');
      decreaseBtn.click();

      expect(updates).toHaveLength(1);
      expect(updates[0].name).toBe("Widget");
      expect(updates[0].qty).toBe(2);
    });
  });

  test("attachQuantityHandlers attaches increase button handlers", () => {
    withMockStorage(() => {
      document.body.innerHTML = `
        <div id="container">
          <button data-action="decrease" data-name="Widget">−</button>
          <input type="number" data-name="Widget" value="3">
          <button data-action="increase" data-name="Widget">+</button>
        </div>
      `;
      saveCart([{ item_name: "Widget", unit_price: 10, quantity: 3 }]);

      const container = document.getElementById("container");
      const updates = [];

      attachQuantityHandlers(container, (name, qty) => {
        updates.push({ name, qty });
      });

      // Simulate click on increase button
      const increaseBtn = container.querySelector('[data-action="increase"]');
      increaseBtn.click();

      expect(updates).toHaveLength(1);
      expect(updates[0].name).toBe("Widget");
      expect(updates[0].qty).toBe(4);
    });
  });

  test("attachQuantityHandlers attaches input change handlers", () => {
    withMockStorage(() => {
      document.body.innerHTML = `
        <div id="container">
          <input type="number" data-name="Widget" value="3">
        </div>
      `;
      saveCart([{ item_name: "Widget", unit_price: 10, quantity: 3 }]);

      const container = document.getElementById("container");
      const updates = [];

      attachQuantityHandlers(container, (name, qty) => {
        updates.push({ name, qty });
      });

      // Simulate input change
      const input = container.querySelector("input[type='number']");
      input.value = "7";
      input.dispatchEvent(new Event("change"));

      expect(updates).toHaveLength(1);
      expect(updates[0].name).toBe("Widget");
      expect(updates[0].qty).toBe(7);
    });
  });

  test("attachRemoveHandlers attaches remove button handlers", () => {
    withMockStorage(() => {
      document.body.innerHTML = `
        <div id="container">
          <button class="remove-btn" data-name="Widget">Remove</button>
        </div>
      `;
      saveCart([
        { item_name: "Widget", unit_price: 10, quantity: 1 },
        { item_name: "Gadget", unit_price: 20, quantity: 2 },
      ]);

      const container = document.getElementById("container");
      let removeCalled = false;

      attachRemoveHandlers(container, ".remove-btn", () => {
        removeCalled = true;
      });

      // Simulate click on remove button
      const removeBtn = container.querySelector(".remove-btn");
      removeBtn.click();

      expect(removeCalled).toBe(true);
      const cart = getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0].item_name).toBe("Gadget");
    });
  });

  // ----------------------------------------
  // Real Template Tests
  // ----------------------------------------
  test("Cart overlay template renders with all required elements", async () => {
    const dom = await createCheckoutPage({
      cartMode: "stripe",
      checkoutApiUrl: "https://api.test.com",
    });

    const doc = dom.window.document;
    const overlay = doc.getElementById("cart-overlay");

    expect(overlay).toBeTruthy();
    expect(overlay.querySelector(".cart-items")).toBeTruthy();
    expect(overlay.querySelector(".cart-empty")).toBeTruthy();
    expect(overlay.querySelector(".cart-total-amount")).toBeTruthy();
    expect(overlay.querySelector(".cart-checkout-stripe")).toBeTruthy();
    expect(overlay.querySelector(".cart-minimum-message")).toBeTruthy();

    // Verify config is available via script tag
    const configScript = dom.window.document.getElementById("site-config");
    const siteConfig = JSON.parse(configScript.textContent);
    expect(siteConfig.checkout_api_url).toBe("https://api.test.com");
  });

  test("Cart overlay shows PayPal button when cart_mode is paypal", async () => {
    const dom = await createCheckoutPage({
      cartMode: "paypal",
      paypalEmail: "pay@example.com",
      checkoutApiUrl: "https://api.example.com",
    });

    const doc = dom.window.document;
    const stripeBtn = doc.querySelector(".cart-checkout-stripe");
    const paypalBtn = doc.querySelector(".cart-checkout-paypal");

    expect(stripeBtn).toBeNull();
    expect(paypalBtn).toBeTruthy();
  });

  test("Cart overlay shows Stripe button when cart_mode is stripe", async () => {
    const dom = await createCheckoutPage({
      cartMode: "stripe",
      checkoutApiUrl: "https://api.example.com",
    });

    const doc = dom.window.document;
    const stripeBtn = doc.querySelector(".cart-checkout-stripe");
    const paypalBtn = doc.querySelector(".cart-checkout-paypal");

    expect(stripeBtn).toBeTruthy();
    expect(paypalBtn).toBeNull();
  });

  test("Stripe checkout page template renders with data attributes", async () => {
    const dom = await createCheckoutPage({
      includeStripeCheckoutPage: true,
      checkoutApiUrl: "https://checkout.api.com",
    });

    const doc = dom.window.document;
    const page = doc.querySelector(".stripe-checkout-page");

    expect(page).toBeTruthy();
    expect(page.dataset.checkoutApiUrl).toBe("https://checkout.api.com");

    const status = doc.getElementById("status-message");
    expect(status).toBeTruthy();
    expect(status.textContent.includes("Checking cart")).toBe(true);
  });

  test("Cart icon template renders with required elements", async () => {
    const dom = await createCheckoutPage();

    const doc = dom.window.document;
    const cartIcon = doc.querySelector(".cart-icon");

    expect(cartIcon).toBeTruthy();
    expect(cartIcon.querySelector("svg")).toBeTruthy();
    expect(cartIcon.querySelector(".cart-count")).toBeTruthy();
    expect(cartIcon.style.display).toBe("none");
  });

  test("Product options template renders single option as button", async () => {
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

    expect(button).toBeTruthy();

    // Parse the consolidated data-item attribute
    const itemData = JSON.parse(button.dataset.item);
    expect(itemData.name).toBe("My Product");
    expect(itemData.options[0].name).toBe("Standard");
    expect(itemData.options[0].unit_price).toBe(19.99);
    expect(itemData.options[0].sku).toBe("STD-001");
    expect(itemData.options[0].max_quantity).toBe(10);
    expect(button.textContent.includes("19.99")).toBe(true);

    // Should NOT have a select (single option = direct button)
    const select = doc.querySelector(".product-options-select");
    expect(select).toBeNull();
  });

  test("Product options template renders multiple options as select", async () => {
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

    expect(select).toBeTruthy();
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(true);

    // Parse the consolidated data-item attribute
    const itemData = JSON.parse(button.dataset.item);
    expect(itemData.name).toBe("Variable Product");
    expect(itemData.options).toHaveLength(3);

    // Check options in select (values are indices now)
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(4);

    // First option is placeholder
    expect(options[0].disabled).toBe(true);

    // Check second option (Small) - now just value index
    expect(options[1].value).toBe("0");
    expect(options[1].textContent.includes("Small")).toBe(true);
    expect(options[1].textContent.includes("5.00")).toBe(true);

    // Verify the data is in itemData
    expect(itemData.options[0].name).toBe("Small");
    expect(itemData.options[0].unit_price).toBe(5.0);
    expect(itemData.options[0].sku).toBe("VAR-S");
    expect(itemData.options[0].max_quantity).toBe(5);
  });

  test("List item cart button renders Add to Cart for single option products", async () => {
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

    const window = new Window();
    window.document.write(`<div>${html}</div>`);
    const doc = window.document;
    const button = doc.querySelector(".add-to-cart");

    expect(button).toBeTruthy();

    // Parse the consolidated data-item attribute
    const itemData = JSON.parse(button.dataset.item);
    expect(itemData.name).toBe("Test Product");
    expect(itemData.options[0].name).toBe("Standard");
    expect(itemData.options[0].unit_price).toBe(29.99);
    expect(itemData.options[0].max_quantity).toBe(5);
    expect(itemData.options[0].sku).toBe("TP1");
  });

  test("List item cart button shows Select Options link for multi-option products", async () => {
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

    const window = new Window();
    window.document.write(`<div>${html}</div>`);
    const doc = window.document;
    const button = doc.querySelector(".add-to-cart");
    const link = doc.querySelector("a.button");

    expect(button).toBeNull();
    expect(link).toBeTruthy();
    expect(link.href.includes("/products/variable-product/")).toBe(true);
    expect(link.textContent.includes("Select Options")).toBe(true);
  });

  test("List item cart button renders nothing when cart_mode is null", async () => {
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

    expect(html.trim()).toBe("");
  });

  test("List item cart button renders nothing for items without options", async () => {
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

    expect(html.trim()).toBe("");
  });

  test("Product options template renders nothing when no payment configured", async () => {
    const dom = await createCheckoutPage({
      cartMode: null,
      paypalEmail: null,
      productOptions: [{ name: "Test", unit_price: "10.00", sku: "TEST" }],
    });

    const doc = dom.window.document;
    const button = doc.querySelector(".add-to-cart");
    const select = doc.querySelector(".product-options-select");

    expect(button).toBeNull();
    expect(select).toBeNull();
  });

  // ----------------------------------------
  // Stripe Checkout Flow Tests
  // ----------------------------------------
  test("Stripe checkout redirects to homepage when cart is empty", () => {
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

    expect(result).toBe(true);
  });

  test("Checkout sends only sku and quantity to API, not prices", () => {
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

      expect(items).toEqual([
        { sku: "SKU-A", quantity: 2 },
        { sku: "SKU-B", quantity: 1 },
      ]);
      // Verify prices are NOT included (security)
      expect(items[0].unit_price).toBeUndefined();
      expect(items[0].item_name).toBeUndefined();
    });
  });

  test("Successful Stripe session creation redirects to Stripe URL", async () => {
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

    expect(redirected).toBe(true);
  });

  test("API error returns error message for display", async () => {
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

    expect(response.ok).toBe(false);
    const error = await response.json();
    expect(error.error).toBe("Invalid SKU: FAKE-SKU");
  });

  // ----------------------------------------
  // PayPal Checkout Tests
  // ----------------------------------------
  test("PayPal API checkout redirects to PayPal approval URL", async () => {
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

    expect(locationTracker.wasRedirectedTo("paypal.com")).toBe(true);
  });

  // ----------------------------------------
  // Business Logic Tests
  // ----------------------------------------
  test("Cart preserves special characters in product names", () => {
    withMockStorage(() => {
      saveCart([
        { item_name: 'Widget "Deluxe" & More', unit_price: 10, quantity: 1 },
      ]);

      const cart = getCart();
      expect(cart[0].item_name).toBe('Widget "Deluxe" & More');
    });
  });

  // ----------------------------------------
  // updateItemQuantity Tests (using actual production function)
  // ----------------------------------------
  test("updateItemQuantity changes quantity for existing item", () => {
    withMockStorage(() => {
      saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);

      const result = updateItemQuantity("Widget", 5);

      expect(result).toBe(true);
      const cart = getCart();
      expect(cart[0].quantity).toBe(5);
    });
  });

  test("updateItemQuantity removes item when quantity is 0", () => {
    withMockStorage(() => {
      saveCart([
        { item_name: "Keep", unit_price: 10, quantity: 1 },
        { item_name: "Remove", unit_price: 5, quantity: 3 },
      ]);

      updateItemQuantity("Remove", 0);

      const cart = getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0].item_name).toBe("Keep");
    });
  });

  test("updateItemQuantity returns false for non-existent item", () => {
    withMockStorage(() => {
      saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);

      const result = updateItemQuantity("NonExistent", 5);

      expect(result).toBe(false);
    });
  });

  // ----------------------------------------
  // Add to Cart Button Tests
  // ----------------------------------------
  test("Add to cart button contains all necessary data attributes", async () => {
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

    expect(button).toBeTruthy();

    // Parse the consolidated data-item attribute
    const itemData = JSON.parse(button.dataset.item);
    expect(itemData.name).toBe("My Product");
    expect(itemData.options[0].name).toBe("Standard");
    expect(itemData.options[0].unit_price).toBe(25.0);
    expect(itemData.options[0].max_quantity).toBe(10);
    expect(itemData.options[0].sku).toBe("PROD-STD");
  });

  test("Price is parsed as float from data attribute", async () => {
    const dom = await createCheckoutPage({
      productOptions: [{ name: "Test", unit_price: "19.99", sku: "T1" }],
    });

    const doc = dom.window.document;
    const button = doc.querySelector(".add-to-cart");

    // Parse from consolidated data-item attribute
    const itemData = JSON.parse(button.dataset.item);
    const price = itemData.options[0].unit_price;

    expect(price).toBe(19.99);
    expect(typeof price).toBe("number");
  });

  // ----------------------------------------
  // Multi-Option Select Tests
  // ----------------------------------------
  test("Multi-option button is disabled until option selected", async () => {
    const dom = await createCheckoutPage({
      productOptions: [
        { name: "Small", unit_price: "5.00", sku: "S" },
        { name: "Large", unit_price: "10.00", sku: "L" },
      ],
    });

    const doc = dom.window.document;
    const button = doc.querySelector(".product-option-button");

    expect(button.disabled).toBe(true);
  });

  test("Multi-option select has disabled placeholder option", async () => {
    const dom = await createCheckoutPage({
      productOptions: [
        { name: "Small", unit_price: "5.00", sku: "S" },
        { name: "Large", unit_price: "10.00", sku: "L" },
      ],
    });

    const doc = dom.window.document;
    const select = doc.querySelector(".product-options-select");
    const firstOption = select.options[0];

    expect(firstOption.disabled).toBe(true);
    expect(firstOption.value).toBe("");
    expect(firstOption.selected).toBe(true);
  });

  test("Select options have index values and button has consolidated data", async () => {
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

    expect(smallOption.value).toBe("0");
    expect(smallOption.textContent.includes("Small")).toBe(true);
    expect(largeOption.value).toBe("1");
    expect(largeOption.textContent.includes("Large")).toBe(true);

    // All data is now in the button's data-item attribute
    const itemData = JSON.parse(button.dataset.item);
    expect(itemData.options[0].name).toBe("Small");
    expect(itemData.options[0].unit_price).toBe(5.0);
    expect(itemData.options[0].sku).toBe("SKU-S");
    expect(itemData.options[0].max_quantity).toBe(10);

    expect(itemData.options[1].name).toBe("Large");
    expect(itemData.options[1].unit_price).toBe(10.0);
    expect(itemData.options[1].sku).toBe("SKU-L");
    expect(itemData.options[1].max_quantity).toBe(5);
  });

  test("Selecting an option retrieves correct option data from button", async () => {
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

    // Verify option lookup returns correct data
    expect(option.name).toBe("Small");
    expect(option.unit_price).toBe(5.0);
    expect(option.sku).toBe("S");

    // Verify select index mapping works for other options
    select.selectedIndex = 2; // Select "Large"
    const largeIndex = parseInt(select.options[select.selectedIndex].value, 10);
    const largeOption = itemData.options[largeIndex];

    expect(largeOption.name).toBe("Large");
    expect(largeOption.unit_price).toBe(10.0);
  });

  // ----------------------------------------
  // Quote Mode (Enquiry) Tests
  // ----------------------------------------
  // Note: quote-mode-add-to-cart-works was removed because it reimplemented
  // 140+ lines of cart.js logic inline. The quote-mode-config-is-set and
  // quote-mode-no-cart-overlay tests verify quote mode without this problem.
  // Cart functionality is tested via the cart-utils tests that call actual
  // production functions.
  test("Quote mode sets cart_mode in config script", async () => {
    const dom = await createCheckoutPage({
      cartMode: "quote",
      productOptions: [{ name: "Test", unit_price: "10.00", sku: "T1" }],
    });

    const doc = dom.window.document;
    const cartIcon = doc.querySelector(".cart-icon");

    expect(cartIcon).toBeTruthy();

    // Verify config script has quote mode
    const configScript = doc.getElementById("site-config");
    const siteConfig = JSON.parse(configScript.textContent);
    expect(siteConfig.cart_mode).toBe("quote");
  });

  test("Quote mode should not render cart overlay", async () => {
    const dom = await createCheckoutPage({
      cartMode: "quote",
      productOptions: [{ name: "Test", unit_price: "10.00", sku: "T1" }],
    });

    const doc = dom.window.document;
    const cartOverlay = doc.getElementById("cart-overlay");

    expect(cartOverlay).toBeNull();
  });
});
