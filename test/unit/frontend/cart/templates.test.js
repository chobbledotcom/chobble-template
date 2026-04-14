// Liquid template rendering tests for the cart/checkout surface.
// Exercises real templates so changes to them are caught, without
// re-implementing any cart-utils logic (tested separately).

import { describe, expect, test } from "bun:test";
import { Liquid } from "liquidjs";
import { configureJsConfig } from "#eleventy/js-config.js";
import {
  createMockEleventyConfig,
  fs,
  path,
  rootDir,
} from "#test/test-utils.js";
import { formatPrice as formatCurrency } from "#utils/format-price.js";
import { loadDOM } from "#utils/lazy-dom.js";

// ----------------------------------------
// Shared Liquid engine + renderer
// ----------------------------------------
const liquid = new Liquid({
  root: [
    path.join(rootDir, "src/_includes"),
    path.join(rootDir, "src/_layouts"),
  ],
  extname: ".html",
});

liquid.registerFilter(
  "icon",
  () => '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>',
);
liquid.registerFilter("to_price", (value) => formatCurrency("GBP", value));

const renderTemplate = (templatePath, data = {}) => {
  const template = fs.readFileSync(path.join(rootDir, templatePath), "utf-8");
  return liquid.parseAndRender(template, data);
};

const getJsConfigFilter = () => {
  const mockConfig = createMockEleventyConfig();
  configureJsConfig(mockConfig);
  return mockConfig.filters.jsConfigJson;
};

// Builds the cart_attributes data attribute the way Eleventy computed fields do.
const buildCartAttributes = (title, options, specs = null) =>
  JSON.stringify({
    name: title,
    options: options.map((opt) => ({
      name: opt.name,
      unit_price: Number.parseFloat(opt.unit_price),
      max_quantity: opt.max_quantity || null,
      sku: opt.sku || null,
    })),
    specs,
  }).replace(/"/g, "&quot;");

// Renders the full product page surface (cart icon + overlay + product options)
// and returns a parsed DOM for assertions.
const renderProductPage = async (options = {}) => {
  const {
    cartMode = "stripe",
    ecommerceApiHost = "api.example.com",
    productTitle = "Test Product",
    productOptions = [
      { name: "Small", unit_price: "5.00", max_quantity: 5, sku: "SKU-S" },
      { name: "Large", unit_price: "10.00", max_quantity: 3, sku: "SKU-L" },
    ],
    hasSingleCartOption = false,
    showCartQuantitySelector = false,
    includeStripeCheckoutPage = false,
  } = options;

  const config = {
    cart_mode: cartMode,
    ecommerce_api_host: ecommerceApiHost,
    currency: "GBP",
  };

  const cart_attributes =
    productOptions && productOptions.length > 0
      ? buildCartAttributes(productTitle, productOptions)
      : null;

  const cartIcon = await renderTemplate("src/_includes/cart-icon.html", {
    config,
  });
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
      has_single_cart_option: hasSingleCartOption,
      show_cart_quantity_selector: showCartQuantitySelector,
    },
  );
  const stripeCheckoutPage = includeStripeCheckoutPage
    ? (
        await renderTemplate("src/_layouts/stripe-checkout.html", { config })
      ).replace(/^---[\s\S]*?---\s*/, "")
    : "";

  const configScript = `<script id="site-config" type="application/json">${getJsConfigFilter()(config)}</script>`;

  const html = `<!DOCTYPE html><html><head>${configScript}</head><body>
    ${cartIcon}${cartOverlay}${stripeCheckoutPage}
    <div class="product-page">${productOptionsHtml}</div>
  </body></html>`;

  const { window } = await loadDOM(html, { url: "https://example.com" });
  return window.document;
};

const renderListItemCartButton = async ({ cartMode, item }) => {
  const html = await renderTemplate(
    "src/_includes/list-item-cart-button.html",
    { config: { cart_mode: cartMode }, item },
  );
  const { window } = await loadDOM(`<div>${html}</div>`);
  return { html, document: window.document };
};

// ----------------------------------------
// Cart overlay / icon
// ----------------------------------------
describe("cart-overlay.html", () => {
  test("renders the structural elements the cart renderer targets", async () => {
    const doc = await renderProductPage({ cartMode: "stripe" });
    const overlay = doc.getElementById("cart-overlay");

    expect(overlay).toBeTruthy();
    expect(overlay.querySelector(".cart-items")).toBeTruthy();
    expect(overlay.querySelector(".cart-empty")).toBeTruthy();
    expect(overlay.querySelector(".cart-total-amount")).toBeTruthy();
    expect(overlay.querySelector(".cart-checkout-stripe")).toBeTruthy();
    expect(overlay.querySelector(".cart-minimum-message")).toBeTruthy();
  });

  test("is omitted entirely in quote mode", async () => {
    const doc = await renderProductPage({ cartMode: "quote" });
    expect(doc.getElementById("cart-overlay")).toBeNull();
  });
});

describe("cart-icon.html", () => {
  test("renders an SVG icon, a count badge, and starts hidden", async () => {
    const doc = await renderProductPage();
    const cartIcon = doc.querySelector(".cart-icon");

    expect(cartIcon).toBeTruthy();
    expect(cartIcon.querySelector("svg")).toBeTruthy();
    expect(cartIcon.querySelector(".cart-count")).toBeTruthy();
    expect(cartIcon.style.display).toBe("none");
  });
});

// ----------------------------------------
// Site config script
// ----------------------------------------
describe("site-config script", () => {
  test("exposes ecommerce_api_host from eleventy config filter", async () => {
    const doc = await renderProductPage({ ecommerceApiHost: "api.test.com" });
    const siteConfig = JSON.parse(
      doc.getElementById("site-config").textContent,
    );
    expect(siteConfig.ecommerce_api_host).toBe("api.test.com");
  });

  test("exposes cart_mode so client scripts can branch on it", async () => {
    const doc = await renderProductPage({ cartMode: "quote" });
    const siteConfig = JSON.parse(
      doc.getElementById("site-config").textContent,
    );
    expect(siteConfig.cart_mode).toBe("quote");
  });
});

// ----------------------------------------
// Stripe checkout layout
// ----------------------------------------
describe("stripe-checkout.html", () => {
  test("renders the status message the client script updates", async () => {
    const doc = await renderProductPage({ includeStripeCheckoutPage: true });
    const status = doc.getElementById("status-message");
    expect(doc.querySelector(".stripe-checkout-page")).toBeTruthy();
    expect(status).toBeTruthy();
    expect(status.textContent).toContain("Checking cart");
  });
});

// ----------------------------------------
// Product options
// ----------------------------------------
describe("product-options.html", () => {
  test("renders a single option as a direct Add to Cart button with item data", async () => {
    const doc = await renderProductPage({
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
    const button = doc.querySelector(".add-to-cart");
    expect(button).toBeTruthy();
    expect(doc.querySelector(".product-options-select")).toBeNull();

    const itemData = JSON.parse(button.dataset.item);
    expect(itemData.name).toBe("My Product");
    expect(itemData.options).toHaveLength(1);
    expect(itemData.options[0]).toMatchObject({
      name: "Standard",
      unit_price: 19.99,
      max_quantity: 10,
      sku: "STD-001",
    });
    expect(button.textContent).toContain("19.99");
  });

  test("unit_price is a number (not a string) inside the data-item JSON", async () => {
    // Guards against liquidjs changes that would regress serialisation types.
    const doc = await renderProductPage({
      productOptions: [{ name: "Test", unit_price: "19.99", sku: "T1" }],
      hasSingleCartOption: true,
    });
    const itemData = JSON.parse(doc.querySelector(".add-to-cart").dataset.item);
    expect(typeof itemData.options[0].unit_price).toBe("number");
    expect(itemData.options[0].unit_price).toBe(19.99);
  });

  test("renders multiple options as a disabled placeholder + select", async () => {
    const doc = await renderProductPage({
      productTitle: "Variable Product",
      productOptions: [
        { name: "Small", unit_price: "5.00", max_quantity: 5, sku: "VAR-S" },
        { name: "Medium", unit_price: "7.50", max_quantity: 3, sku: "VAR-M" },
        { name: "Large", unit_price: "10.00", max_quantity: 2, sku: "VAR-L" },
      ],
    });
    const select = doc.querySelector(".product-options-select");
    const button = doc.querySelector(".product-option-button");

    expect(select).toBeTruthy();
    expect(button.disabled).toBe(true);

    const selectOptions = select.querySelectorAll("option");
    expect(selectOptions).toHaveLength(4);
    expect(selectOptions[0].disabled).toBe(true);
    expect(selectOptions[0].selected).toBe(true);
    expect(selectOptions[0].value).toBe("");
  });

  test("each <option> value is the index into the button's data-item options array", async () => {
    // This is the contract cart.js relies on:
    //   optionIndex = parseInt(select.value, 10); option = data.options[optionIndex]
    const doc = await renderProductPage({
      productOptions: [
        { name: "Small", unit_price: "5.00", max_quantity: 10, sku: "SKU-S" },
        { name: "Large", unit_price: "10.00", max_quantity: 5, sku: "SKU-L" },
      ],
    });
    const select = doc.querySelector(".product-options-select");
    const itemData = JSON.parse(
      doc.querySelector(".product-option-button").dataset.item,
    );

    // skip placeholder at [0]
    const smallIdx = Number.parseInt(select.options[1].value, 10);
    const largeIdx = Number.parseInt(select.options[2].value, 10);

    expect(itemData.options[smallIdx].name).toBe("Small");
    expect(itemData.options[smallIdx].sku).toBe("SKU-S");
    expect(itemData.options[largeIdx].name).toBe("Large");
    expect(itemData.options[largeIdx].sku).toBe("SKU-L");
  });

  test("select option labels include the localised price", async () => {
    const doc = await renderProductPage({
      productOptions: [
        { name: "Small", unit_price: "5.00", sku: "S" },
        { name: "Large", unit_price: "10.00", sku: "L" },
      ],
    });
    const small = doc.querySelector(".product-options-select").options[1];
    expect(small.textContent).toContain("Small");
    expect(small.textContent).toContain("£5");
  });

  test("renders nothing when no payment is configured", async () => {
    const doc = await renderProductPage({
      cartMode: null,
      productOptions: [{ name: "Test", unit_price: "10.00", sku: "TEST" }],
    });
    expect(doc.querySelector(".add-to-cart")).toBeNull();
    expect(doc.querySelector(".product-options-select")).toBeNull();
  });
});

// ----------------------------------------
// List item cart button
// ----------------------------------------
const singleOptionListItem = () => ({
  data: {
    title: "Test Product",
    options: [
      { name: "Standard", unit_price: 29.99, max_quantity: 5, sku: "TP1" },
    ],
    cart_attributes: buildCartAttributes("Test Product", [
      { name: "Standard", unit_price: "29.99", max_quantity: 5, sku: "TP1" },
    ]),
    has_single_cart_option: true,
    cart_btn_text: "Add to Cart",
    show_cart_quantity_selector: false,
  },
  url: "/products/test-product/",
});

describe("list-item-cart-button.html", () => {
  test("renders an inline Add to Cart button for single-option products", async () => {
    const { document: doc } = await renderListItemCartButton({
      cartMode: "stripe",
      item: singleOptionListItem(),
    });
    const button = doc.querySelector(".add-to-cart");
    expect(button).toBeTruthy();

    const itemData = JSON.parse(button.dataset.item);
    expect(itemData.name).toBe("Test Product");
    expect(itemData.options[0]).toMatchObject({
      name: "Standard",
      unit_price: 29.99,
      max_quantity: 5,
      sku: "TP1",
    });
  });

  test("links to the product page for multi-option products", async () => {
    const { document: doc } = await renderListItemCartButton({
      cartMode: "stripe",
      item: {
        data: {
          title: "Variable Product",
          options: [
            { name: "Small", unit_price: 19.99, sku: "VP-S" },
            { name: "Large", unit_price: 29.99, sku: "VP-L" },
          ],
          cart_attributes: buildCartAttributes("Variable Product", [
            { name: "Small", unit_price: "19.99", sku: "VP-S" },
            { name: "Large", unit_price: "29.99", sku: "VP-L" },
          ]),
          has_single_cart_option: false,
        },
        url: "/products/variable-product/",
      },
    });

    expect(doc.querySelector(".add-to-cart")).toBeNull();
    const link = doc.querySelector("a.button");
    expect(link).toBeTruthy();
    expect(link.href).toContain("/products/variable-product/");
    expect(link.textContent).toContain("Select Options");
  });

  test("renders nothing when cart_mode is not set", async () => {
    const { html } = await renderListItemCartButton({
      cartMode: null,
      item: singleOptionListItem(),
    });
    expect(html.trim()).toBe("");
  });

  test("renders nothing for items without purchasable options", async () => {
    const { html } = await renderListItemCartButton({
      cartMode: "stripe",
      item: { data: { title: "Blog Post" }, url: "/news/blog-post/" },
    });
    expect(html.trim()).toBe("");
  });
});
