// Quote price utilities tests
// Tests the public API: updateQuotePrice and setupDetailsBlurHandlers
// Uses actual Liquid templates to ensure tests match production

import { describe, expect, mock, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { Liquid } from "liquidjs";
import { STORAGE_KEY } from "#public/utils/cart-utils.js";
import {
  setupDetailsBlurHandlers,
  updateQuotePrice,
} from "#public/utils/quote-price-utils.js";
import { IDS } from "#public/utils/selectors.js";
import { rootDir } from "#test/test-utils.js";

// Set up Liquid engine to render actual templates
const liquid = new Liquid({
  root: [path.join(rootDir, "src/_includes")],
  extname: ".html",
});

// Render the actual quote-price template with selectors
const renderQuotePriceTemplates = async () => {
  const templatePath = path.join(
    rootDir,
    "src/_includes/templates/quote-price.html",
  );
  const template = fs.readFileSync(templatePath, "utf-8");
  return liquid.parseAndRender(template, { selectors: { IDS } });
};

// Field labels used in tests - must match what's in setupFullDOM
const FIELD_LABELS = {
  name: "Your Name",
  email: "Email",
  event_type: "Event Type",
  contact: "Contact Preference",
  message: "Message",
};

// Default cart item for field details tests
const DEFAULT_CART = [
  { item_name: "Item", product_mode: "buy", unit_price: 10, quantity: 1 },
];

describe("quote-price-utils", () => {
  // ----------------------------------------
  // updateQuotePrice Tests
  // ----------------------------------------
  describe("updateQuotePrice", () => {
    // Use actual production templates to ensure tests match real behavior
    const setupFullDOM = async (cart = [], formFields = "") => {
      const templates = await renderQuotePriceTemplates();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">${JSON.stringify(FIELD_LABELS)}</script>

        ${templates}

        <div id="quote-price"></div>

        <form>
          ${formFields}
        </form>
      `;
    };

    // Helper to get rendered details
    const getDetails = () =>
      document.querySelectorAll('[data-field="details"] > li');

    // Helper to verify single detail entry
    const expectSingleDetail = (expectedKey, expectedValue) => {
      const details = getDetails();
      expect(details).toHaveLength(1);
      expect(details[0].querySelector('[data-field="key"]').textContent).toBe(
        expectedKey,
      );
      expect(details[0].querySelector('[data-field="value"]').textContent).toBe(
        expectedValue,
      );
    };

    test("does nothing when container not found", () => {
      document.body.innerHTML = "<div>No container</div>";
      expect(() => updateQuotePrice()).not.toThrow();
    });

    test("hides container when cart is empty", async () => {
      await setupFullDOM([]);
      updateQuotePrice();
      const container = document.getElementById("quote-price");
      expect(container.style.display).toBe("none");
      expect(container.innerHTML).toBe("");
    });

    test("renders cart items with quantity multiplier", async () => {
      const cart = [
        {
          item_name: "Bouncy Castle",
          product_mode: "hire",
          hire_prices: { 1: "£50" },
          quantity: 1,
        },
        {
          item_name: "Slide",
          product_mode: "hire",
          hire_prices: { 1: "£30" },
          quantity: 2,
        },
      ];
      await setupFullDOM(cart);
      updateQuotePrice(1);

      const container = document.getElementById("quote-price");
      expect(container.style.display).toBe("block");

      const items = container.querySelectorAll('[data-field="items"] > li');
      expect(items).toHaveLength(2);
      expect(items[0].querySelector('[data-field="name"]').textContent).toBe(
        "Bouncy Castle",
      );
      expect(items[1].querySelector('[data-field="name"]').textContent).toBe(
        "Slide (×2)",
      );
    });

    test("calculates and displays total price", async () => {
      const cart = [
        {
          item_name: "Item A",
          product_mode: "hire",
          hire_prices: { 1: "£20" },
          quantity: 1,
        },
        {
          item_name: "Item B",
          product_mode: "hire",
          hire_prices: { 1: "£30" },
          quantity: 1,
        },
      ];
      await setupFullDOM(cart);
      updateQuotePrice(1);

      expect(document.querySelector('[data-field="total"]').textContent).toBe(
        "£50",
      );
    });

    test("displays TBC when price unavailable for day count", async () => {
      const cart = [
        {
          item_name: "Item",
          product_mode: "hire",
          hire_prices: { 1: "£20" },
          quantity: 1,
        },
      ];
      await setupFullDOM(cart);
      updateQuotePrice(5); // No price for 5 days

      expect(document.querySelector('[data-field="total"]').textContent).toBe(
        "TBC",
      );
      expect(
        document.querySelector(
          '[data-field="items"] > li [data-field="price"]',
        ).textContent,
      ).toBe("TBC");
    });

    test("displays singular item count and hire length for 1", async () => {
      const cart = [
        {
          item_name: "Single Item",
          product_mode: "hire",
          hire_prices: { 1: "£50" },
          quantity: 1,
        },
      ];
      await setupFullDOM(cart);
      updateQuotePrice(1);

      expect(
        document.querySelector('[data-field="item-count"]').textContent,
      ).toBe("1 item in order");
      expect(
        document.querySelector('[data-field="hire-length"]').textContent,
      ).toBe("1 day");
    });

    test("displays plural item count and hire length for multiple", async () => {
      const cart = [
        {
          item_name: "Item A",
          product_mode: "hire",
          hire_prices: { 3: "£50" },
          quantity: 2,
        },
        {
          item_name: "Item B",
          product_mode: "hire",
          hire_prices: { 3: "£25" },
          quantity: 1,
        },
      ];
      await setupFullDOM(cart);
      updateQuotePrice(3);

      expect(
        document.querySelector('[data-field="item-count"]').textContent,
      ).toBe("3 items in order");
      expect(
        document.querySelector('[data-field="hire-length"]').textContent,
      ).toBe("3 days");
    });

    test("renders text input field details from form", async () => {
      const formFields = `
        <input id="name" name="name" type="text" value="John Doe" />
        <input id="email" name="email" type="email" value="john@example.com" />
      `;
      await setupFullDOM(DEFAULT_CART, formFields);
      updateQuotePrice(1);

      const details = getDetails();
      expect(details).toHaveLength(2);
      expect(details[0].querySelector('[data-field="key"]').textContent).toBe(
        "Your Name",
      );
      expect(details[0].querySelector('[data-field="value"]').textContent).toBe(
        "John Doe",
      );
    });

    test("renders select field showing selected option text", async () => {
      const formFields = `
        <select id="event_type" name="event_type">
          <option value="">Choose...</option>
          <option value="wedding" selected>Wedding Celebration</option>
        </select>
      `;
      await setupFullDOM(DEFAULT_CART, formFields);
      updateQuotePrice(1);
      expectSingleDetail("Event Type", "Wedding Celebration");
    });

    test("renders checked radio field value", async () => {
      const formFields = `
        <input type="radio" name="contact" value="Email" />
        <input type="radio" name="contact" value="Phone" checked />
      `;
      await setupFullDOM(DEFAULT_CART, formFields);
      updateQuotePrice(1);
      expectSingleDetail("Contact Preference", "Phone");
    });

    test("renders textarea field value", async () => {
      const formFields = `
        <textarea id="message" name="message">Special requirements here</textarea>
      `;
      await setupFullDOM(DEFAULT_CART, formFields);
      updateQuotePrice(1);
      expectSingleDetail("Message", "Special requirements here");
    });

    test("excludes empty fields from details", async () => {
      const formFields = `
        <input id="name" name="name" type="text" value="" />
        <input id="email" name="email" type="email" value="filled@example.com" />
        <textarea id="message" name="message"></textarea>
      `;
      await setupFullDOM(DEFAULT_CART, formFields);
      updateQuotePrice(1);
      expectSingleDetail("Email", "filled@example.com");
    });

    test("excludes unchecked radio groups from details", async () => {
      const formFields = `
        <input id="name" name="name" type="text" value="John" />
        <input type="radio" name="contact" value="Email" />
        <input type="radio" name="contact" value="Phone" />
      `;
      await setupFullDOM(DEFAULT_CART, formFields);
      updateQuotePrice(1);
      expectSingleDetail("Your Name", "John");
    });

    test("deduplicates radio buttons showing single entry per group", async () => {
      const formFields = `
        <input type="radio" name="contact" value="Email" checked />
        <input type="radio" name="contact" value="Phone" />
        <input type="radio" name="contact" value="Post" />
      `;
      await setupFullDOM(DEFAULT_CART, formFields);
      updateQuotePrice(1);
      expectSingleDetail("Contact Preference", "Email");
    });

    test("handles non-hire items correctly", async () => {
      const cart = [
        {
          item_name: "Purchase Item",
          product_mode: "buy",
          unit_price: 25,
          quantity: 3,
        },
      ];
      await setupFullDOM(cart);
      updateQuotePrice(1);

      expect(
        document.querySelector('[data-field="items"] > li [data-field="price"]')
          .textContent,
      ).toBe("£75");
      expect(document.querySelector('[data-field="total"]').textContent).toBe(
        "£75",
      );
    });

    test("parses hire prices with currency symbols", async () => {
      const cart = [
        {
          item_name: "Item",
          product_mode: "hire",
          hire_prices: { 1: "£25.50" },
          quantity: 2,
        },
      ];
      await setupFullDOM(cart);
      updateQuotePrice(1);

      expect(document.querySelector('[data-field="total"]').textContent).toBe(
        "£51",
      );
    });

    test("uses quote-steps container for field details when available", async () => {
      const templates = await renderQuotePriceTemplates();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CART));
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{"name": "Your Name"}</script>
        ${templates}
        <div id="quote-price"></div>
        <div class="quote-steps">
          <input id="name" name="name" type="text" value="Quote Steps Name" />
        </div>
        <form>
          <input id="other" name="other" type="text" value="Form Field" />
        </form>
      `;
      updateQuotePrice(1);

      const detail = document.querySelector('[data-field="details"] > li');
      expect(detail.querySelector('[data-field="value"]').textContent).toBe(
        "Quote Steps Name",
      );
    });

    test("hides details section when no fields have values", async () => {
      const formFields = '<input id="name" name="name" type="text" value="" />';
      await setupFullDOM(DEFAULT_CART, formFields);
      updateQuotePrice(1);

      const detailsContainer = document.querySelector('[data-field="details"]');
      expect(detailsContainer.parentElement.style.display).toBe("none");
    });
  });

  // ----------------------------------------
  // setupDetailsBlurHandlers Tests
  // ----------------------------------------
  describe("setupDetailsBlurHandlers", () => {
    const setupBlurTestDOM = (formHtml, useQuoteSteps = false) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      const containerHtml = useQuoteSteps
        ? `<div class="quote-steps">${formHtml}</div>`
        : `<form>${formHtml}</form>`;
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{}</script>
        ${containerHtml}
        <div id="quote-price"></div>
      `;
    };

    const triggerAndExpectCallback = (element, eventType, getDays) => {
      const EventClass = eventType === "blur" ? FocusEvent : Event;
      element.dispatchEvent(
        new EventClass(eventType, { bubbles: eventType !== "blur" }),
      );
      expect(getDays).toHaveBeenCalled();
    };

    test("calls getDays callback on input blur", () => {
      setupBlurTestDOM('<input id="name" type="text" />');
      const getDays = mock(() => 1);
      setupDetailsBlurHandlers(getDays);
      triggerAndExpectCallback(
        document.getElementById("name"),
        "blur",
        getDays,
      );
    });

    test("calls getDays callback on radio change", () => {
      setupBlurTestDOM(`
        <input type="radio" name="pref" value="A" />
        <input type="radio" name="pref" value="B" />
      `);
      const getDays = mock(() => 2);
      setupDetailsBlurHandlers(getDays);
      triggerAndExpectCallback(
        document.querySelector('input[type="radio"]'),
        "change",
        getDays,
      );
    });

    test("calls getDays callback on select change", () => {
      setupBlurTestDOM(`
        <select id="event">
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
      `);
      const getDays = mock(() => 3);
      setupDetailsBlurHandlers(getDays);
      triggerAndExpectCallback(
        document.getElementById("event"),
        "change",
        getDays,
      );
    });

    test("uses quote-steps container if available", () => {
      setupBlurTestDOM('<input id="name" type="text" />', true);
      const getDays = mock(() => 1);
      setupDetailsBlurHandlers(getDays);
      triggerAndExpectCallback(
        document.getElementById("name"),
        "blur",
        getDays,
      );
    });
  });
});
