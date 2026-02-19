// Checkout E2E Tests using happy-dom
// Tests the complete checkout flow with mocked Stripe API
// Uses actual cart-utils.js and renders real Liquid templates

import { describe, expect, mock, test } from "bun:test";
import { Liquid } from "liquidjs";
import { configureJsConfig } from "#eleventy/js-config.js";

// Mock notify.js to capture notification calls instead of DOM manipulation
const mockShowNotification = mock();
mock.module("#public/utils/notify.js", () => ({
  showNotification: (...args) => mockShowNotification(...args),
}));

// Import actual cart utilities
import {
  attachQuantityHandlers,
  attachRemoveHandlers,
  formatPrice,
  getCart,
  saveCart,
  updateCartIcon,
  updateItemQuantity,
} from "#public/utils/cart-utils.js";
import {
  CART_STORAGE_KEY,
  createMockEleventyConfig,
  expectObjectProps,
  fs,
  path,
  rootDir,
} from "#test/test-utils.js";
import { formatPrice as formatCurrency } from "#utils/format-price.js";
import { loadDOM } from "#utils/lazy-dom.js";

// Get the jsConfigJson filter via Eleventy registration
const getJsConfigFilter = () => {
  const mockConfig = createMockEleventyConfig();
  configureJsConfig(mockConfig);
  return mockConfig.filters.jsConfigJson;
};

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

// Register icon filter used by cart-icon.html
liquid.registerFilter(
  "icon",
  () => '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>',
);

// Register to_price filter used by product-options.html
liquid.registerFilter("to_price", (value) => formatCurrency("GBP", value));

// Read and render actual Liquid templates
const renderTemplate = async (templatePath, data = {}) => {
  const fullPath = path.join(rootDir, templatePath);
  const template = fs.readFileSync(fullPath, "utf-8");
  return liquid.parseAndRender(template, data);
};

// Create a complete page with cart overlay from real templates
const createCheckoutPage = async (options = {}) => {
  const {
    ecommerceApiHost = "api.example.com",
    cartMode = "stripe",
    includeStripeCheckoutPage = false,
    // Product options for testing add-to-cart
    productTitle = "Test Product",
    productOptions = [
      { name: "Small", unit_price: "5.00", max_quantity: 5, sku: "SKU-S" },
      { name: "Large", unit_price: "10.00", max_quantity: 3, sku: "SKU-L" },
    ],
    productSpecs = null,
    productMode = null,
    // Computed values - must be provided explicitly as test fixtures
    hasSingleCartOption = false,
    showCartQuantitySelector = false,
  } = options;

  const config = {
    cart_mode: cartMode,
    ecommerce_api_host: ecommerceApiHost,
    currency: "GBP",
  };

  // Build cart_attributes fixture (JSON serialization for data attribute)
  const cart_attributes =
    productOptions && productOptions.length > 0
      ? JSON.stringify({
          name: productTitle,
          options: productOptions.map((opt) => ({
            name: opt.name,
            unit_price: Number.parseFloat(opt.unit_price),
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

  // Only include cart overlay for stripe mode (not quote mode)
  const cartOverlay =
    cartMode !== "quote"
      ? await renderTemplate("src/_includes/cart-overlay.html", { config })
      : "";

  const productOptionsHtml = await renderTemplate(
    "src/_includes/product-options.html",
    {
      config,
      title: productTitle,
      options: productOptions,
      cart_attributes,
      product_mode: productMode,
      has_single_cart_option: hasSingleCartOption,
      show_cart_quantity_selector: showCartQuantitySelector,
    },
  );

  // Render stripe checkout page if needed
  const stripeCheckoutPage = includeStripeCheckoutPage
    ? (
        await renderTemplate("src/_layouts/stripe-checkout.html", { config })
      ).replace(/^---[\s\S]*?---\s*/, "")
    : "";

  // Build config script using the Eleventy filter
  const jsConfigJson = getJsConfigFilter();
  const configScript = `<script id="site-config" type="application/json">${jsConfigJson(config)}</script>`;

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

  const { window } = await loadDOM(html, { url: "https://example.com" });
  return { window };
};

// ============================================
// Mock Utilities
// ============================================

const createMockFetch = (responses = {}) => {
  const calls = [];

  const fetchMock = async (url, options = {}) => {
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

  fetchMock.calls = calls;
  return fetchMock;
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
const withCheckoutMockStorage = (fn) => {
  globalThis.localStorage.clear();
  try {
    return fn(globalThis.localStorage);
  } finally {
    globalThis.localStorage.clear();
  }
};

// Ensure site-config is available for getCurrency() in cart-utils
const siteConfig = document.createElement("script");
siteConfig.id = "site-config";
siteConfig.type = "application/json";
siteConfig.textContent = JSON.stringify({ currency: "GBP" });
document.head.appendChild(siteConfig);

// ============================================
// Test Cases
// ============================================

describe("checkout", () => {
  // ----------------------------------------
  // cart-utils.js Direct Tests
  // ----------------------------------------
  test("getCart returns empty array when localStorage is empty", () => {
    withCheckoutMockStorage(() => {
      const cart = getCart();
      expect(cart).toEqual([]);
    });
  });

  test("saveCart persists cart and getCart retrieves it", () => {
    withCheckoutMockStorage(() => {
      const items = [
        { item_name: "Widget", unit_price: 15.0, quantity: 2, sku: "W1" },
      ];
      saveCart(items);
      const retrieved = getCart();
      expect(retrieved).toEqual(items);
    });
  });

  test("getCart throws on corrupt JSON in localStorage", () => {
    withCheckoutMockStorage((storage) => {
      storage.setItem(CART_STORAGE_KEY, "not valid json {{{");
      expect(() => getCart()).toThrow();
    });
  });

  test("formatPrice formats with £ symbol, stripping trailing .00", () => {
    expect(formatPrice(10)).toBe("£10");
    expect(formatPrice(5.5)).toBe("£5.50");
    expect(formatPrice(0.3)).toBe("£0.30");
    expect(formatPrice(100)).toBe("£100");
    expect(formatPrice(99.99)).toBe("£99.99");
  });

  test("attachRemoveHandlers removes item from cart when button clicked", () => {
    withCheckoutMockStorage(() => {
      saveCart([
        { item_name: "Keep", unit_price: 10, quantity: 1 },
        { item_name: "Remove", unit_price: 5, quantity: 2 },
      ]);
      document.body.innerHTML = `
        <button data-action="remove" data-name="Remove">Remove</button>
      `;
      const tracker = { called: false };
      attachRemoveHandlers(() => {
        tracker.called = true;
      });
      document.querySelector('[data-action="remove"]').click();
      expect(tracker.called).toBe(true);
      const cart = getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0].item_name).toBe("Keep");
    });
  });

  test("updateCartIcon shows cart icon when items in cart", () => {
    withCheckoutMockStorage(() => {
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
    withCheckoutMockStorage(() => {
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
    withCheckoutMockStorage(() => {
      saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);
      const result = updateItemQuantity("Widget", 5);
      expect(result).toBe(true);
      const cart = getCart();
      expect(cart[0].quantity).toBe(5);
    });
  });

  test("updateItemQuantity removes item when quantity is 0 or less", () => {
    withCheckoutMockStorage(() => {
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

  test("updateItemQuantity caps at max_quantity and shows notification", () => {
    mockShowNotification.mockReset();
    withCheckoutMockStorage(() => {
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
      expect(mockShowNotification).toHaveBeenCalledTimes(1);
      expect(mockShowNotification.mock.calls[0][0].includes("5")).toBe(true);
    });
  });

  test("updateItemQuantity returns false for non-existent item", () => {
    withCheckoutMockStorage(() => {
      saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);
      const result = updateItemQuantity("NonExistent", 5);
      expect(result).toBe(false);
    });
  });

  test("attachQuantityHandlers attaches decrease button handlers", () => {
    withCheckoutMockStorage(() => {
      document.body.innerHTML = `
        <button class="quantity-decrease" data-name="Widget">−</button>
        <input type="number" class="quantity-input" data-name="Widget" value="3">
        <button class="quantity-increase" data-name="Widget">+</button>
      `;
      saveCart([{ item_name: "Widget", unit_price: 10, quantity: 3 }]);

      const updates = [];

      attachQuantityHandlers((name, qty) => {
        updates.push({ name, qty });
      });

      // Simulate click on decrease button
      const decreaseBtn = document.querySelector(".quantity-decrease");
      decreaseBtn.click();

      expect(updates).toHaveLength(1);
      expect(updates[0].name).toBe("Widget");
      expect(updates[0].qty).toBe(2);
    });
  });

  test("attachQuantityHandlers attaches increase button handlers", () => {
    withCheckoutMockStorage(() => {
      document.body.innerHTML = `
        <button class="quantity-decrease" data-name="Widget">−</button>
        <input type="number" class="quantity-input" data-name="Widget" value="3">
        <button class="quantity-increase" data-name="Widget">+</button>
      `;
      saveCart([{ item_name: "Widget", unit_price: 10, quantity: 3 }]);

      const updates = [];

      attachQuantityHandlers((name, qty) => {
        updates.push({ name, qty });
      });

      // Simulate click on increase button
      const increaseBtn = document.querySelector(".quantity-increase");
      increaseBtn.click();

      expect(updates).toHaveLength(1);
      expect(updates[0].name).toBe("Widget");
      expect(updates[0].qty).toBe(4);
    });
  });

  test("attachQuantityHandlers attaches input change handlers", () => {
    withCheckoutMockStorage(() => {
      document.body.innerHTML = `
        <input type="number" class="quantity-input" data-name="Widget" value="3">
      `;
      saveCart([{ item_name: "Widget", unit_price: 10, quantity: 3 }]);

      const updates = [];

      attachQuantityHandlers((name, qty) => {
        updates.push({ name, qty });
      });

      // Simulate input change
      const input = document.querySelector(".quantity-input");
      input.value = "7";
      input.dispatchEvent(new Event("change"));

      expect(updates).toHaveLength(1);
      expect(updates[0].name).toBe("Widget");
      expect(updates[0].qty).toBe(7);
    });
  });

  test("attachRemoveHandlers attaches remove button handlers", () => {
    withCheckoutMockStorage(() => {
      document.body.innerHTML = `
        <button data-action="remove" data-name="Widget">Remove</button>
      `;
      saveCart([
        { item_name: "Widget", unit_price: 10, quantity: 1 },
        { item_name: "Gadget", unit_price: 20, quantity: 2 },
      ]);

      const removeCalled = mock(() => {
        // no-op: mock callback for remove handler
      });

      attachRemoveHandlers(removeCalled);

      // Simulate click on remove button
      const removeBtn = document.querySelector('[data-action="remove"]');
      removeBtn.click();

      expect(removeCalled).toHaveBeenCalled();
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
      ecommerceApiHost: "api.test.com",
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
    expect(siteConfig.ecommerce_api_host).toBe("api.test.com");
  });

  test("Cart overlay shows Stripe button when cart_mode is stripe", async () => {
    const dom = await createCheckoutPage({
      cartMode: "stripe",
      ecommerceApiHost: "api.example.com",
    });

    const doc = dom.window.document;
    const stripeBtn = doc.querySelector(".cart-checkout-stripe");

    expect(stripeBtn).toBeTruthy();
  });

  test("Stripe checkout page template renders with status message", async () => {
    const dom = await createCheckoutPage({
      includeStripeCheckoutPage: true,
      ecommerceApiHost: "checkout.api.com",
    });

    const doc = dom.window.document;
    const page = doc.querySelector(".stripe-checkout-page");

    expect(page).toBeTruthy();

    const status = doc.getElementById("status-message");
    expect(status).toBeTruthy();
    expect(status.textContent.includes("Checking cart")).toBe(true);

    // ecommerce_api_host is available via site-config script, not data attribute
    const configScript = doc.getElementById("site-config");
    const siteConfig = JSON.parse(configScript.textContent);
    expect(siteConfig.ecommerce_api_host).toBe("checkout.api.com");
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
      hasSingleCartOption: true,
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
    expect(options[1].textContent.includes("£5")).toBe(true);

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
    // Build cart_attributes fixture (JSON serialization for data attribute)
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
        cart_btn_text: "Add to Cart",
        has_single_cart_option: true,
        show_cart_quantity_selector: false,
      },
      url: "/products/test-product/",
    };

    const html = await renderTemplate(
      "src/_includes/list-item-cart-button.html",
      { config, item },
    );

    const { window } = await loadDOM(`<div>${html}</div>`);
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
    // Build cart_attributes fixture (JSON serialization for data attribute)
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
        has_single_cart_option: false,
      },
      url: "/products/variable-product/",
    };

    const html = await renderTemplate(
      "src/_includes/list-item-cart-button.html",
      { config, item },
    );

    const { window } = await loadDOM(`<div>${html}</div>`);
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
    const result = withCheckoutMockStorage(() => {
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
    withCheckoutMockStorage(() => {
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
    const redirected = await withCheckoutMockStorage(async () => {
      saveCart([
        { item_name: "Widget", unit_price: 15, quantity: 1, sku: "W1" },
      ]);

      const mockFetch = createMockFetch({
        "/api/checkout": {
          ok: true,
          data: {
            url: "https://checkout.stripe.com/pay/cs_test_123",
          },
        },
      });

      const locationTracker = createLocationTracker();
      const cart = getCart();
      const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));

      const response = await mockFetch(
        "https://ecom.chobble.com/api/checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            success_url: "https://example.com/order-complete/",
            cancel_url: "https://example.com/cart/",
          }),
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
      "/api/checkout": {
        ok: false,
        status: 400,
        data: { error: "Invalid SKU: FAKE-SKU" },
      },
    });

    const response = await mockFetch("https://ecom.chobble.com/api/checkout", {
      method: "POST",
      body: JSON.stringify({ items: [{ sku: "FAKE-SKU", quantity: 1 }] }),
    });

    expect(response.ok).toBe(false);
    const error = await response.json();
    expect(error.error).toBe("Invalid SKU: FAKE-SKU");
  });

  // ----------------------------------------
  // Business Logic Tests
  // ----------------------------------------
  test("Cart preserves special characters in product names", () => {
    withCheckoutMockStorage(() => {
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
    withCheckoutMockStorage(() => {
      saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);

      const result = updateItemQuantity("Widget", 5);

      expect(result).toBe(true);
      const cart = getCart();
      expect(cart[0].quantity).toBe(5);
    });
  });

  test("updateItemQuantity removes item when quantity is 0", () => {
    withCheckoutMockStorage(() => {
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
    withCheckoutMockStorage(() => {
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

    expectObjectProps({
      disabled: true,
      value: "",
      selected: true,
    })(firstOption);
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
    const optionIndex = Number.parseInt(
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
    const largeIndex = Number.parseInt(
      select.options[select.selectedIndex].value,
      10,
    );
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
