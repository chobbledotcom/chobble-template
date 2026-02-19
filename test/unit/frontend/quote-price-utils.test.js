// Quote price utilities tests
// Tests the public API: updateQuotePrice and setupDetailsBlurHandlers
// Uses actual Liquid templates to ensure tests match production

import { describe, expect, mock, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { Liquid } from "liquidjs";
import {
  setupDetailsBlurHandlers,
  updateQuotePrice,
} from "#public/utils/quote-price-utils.js";
import { IDS } from "#public/utils/selectors.js";
import { CART_STORAGE_KEY, rootDir } from "#test/test-utils.js";

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

// Cart item factory - creates hire or buy items with sensible defaults
const cartItem = (overrides = {}) => ({
  item_name: "Test Item",
  product_mode: "hire",
  hire_prices: { 1: "£50" },
  quantity: 1,
  ...overrides,
});

const buyItem = (overrides = {}) => ({
  item_name: "Buy Item",
  product_mode: "buy",
  unit_price: 10,
  quantity: 1,
  ...overrides,
});

// Detail assertion helpers
const getDetails = () =>
  document.querySelectorAll('[data-field="details"] > li');
const getDetailKey = (detail) =>
  detail.querySelector('[data-field="key"]').textContent;
const getDetailValue = (detail) =>
  detail.querySelector('[data-field="value"]').textContent;

describe("quote-price-utils", () => {
  // ----------------------------------------
  // updateQuotePrice Tests
  // ----------------------------------------
  describe("updateQuotePrice", () => {
    // Use actual production templates to ensure tests match real behavior
    const setupDOM = async (cart = [], formFields = "") => {
      const templates = await renderQuotePriceTemplates();
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      document.body.innerHTML = `
        <script id="site-config" type="application/json">{"currency":"GBP"}</script>
        <script class="quote-field-labels" type="application/json">{"name": "Your Name", "email": "Email", "phone": "Phone", "contact": "Preferred Contact", "event_type": "Event Type", "message": "Message"}</script>

        ${templates}

        <div id="quote-price"></div>

        <form>
          ${formFields}
        </form>
      `;
    };

    test("does nothing when container not found", () => {
      document.body.innerHTML = "<div>No container</div>";
      expect(() => updateQuotePrice()).not.toThrow();
    });

    test("hides container when cart is empty", async () => {
      await setupDOM([]);
      updateQuotePrice();
      const container = document.getElementById("quote-price");
      expect(container.style.display).toBe("none");
      expect(container.innerHTML).toBe("");
    });

    test("shows container when cart has items", async () => {
      await setupDOM([cartItem({ item_name: "Bouncy Castle" })]);
      updateQuotePrice(1);
      expect(document.getElementById("quote-price").style.display).toBe(
        "block",
      );
    });

    test("renders item names", async () => {
      await setupDOM([cartItem({ item_name: "Bouncy Castle" })]);
      updateQuotePrice(1);
      const itemName = document.querySelector(
        '[data-field="items"] > li [data-field="name"]',
      );
      expect(itemName.textContent).toBe("Bouncy Castle");
    });

    test("appends quantity to item name when quantity > 1", async () => {
      await setupDOM([
        cartItem({
          item_name: "Chair",
          hire_prices: { 1: "£10" },
          quantity: 5,
        }),
      ]);
      updateQuotePrice(1);
      const itemName = document.querySelector(
        '[data-field="items"] > li [data-field="name"]',
      );
      expect(itemName.textContent).toBe("Chair (×5)");
    });

    test("renders multiple cart items", async () => {
      await setupDOM([
        cartItem({ item_name: "Bouncy Castle" }),
        cartItem({
          item_name: "Slide",
          hire_prices: { 1: "£30" },
          quantity: 2,
        }),
      ]);
      updateQuotePrice(1);

      const items = document.querySelectorAll('[data-field="items"] > li');
      expect(items).toHaveLength(2);
      expect(items[0].querySelector('[data-field="name"]').textContent).toBe(
        "Bouncy Castle",
      );
      expect(items[1].querySelector('[data-field="name"]').textContent).toBe(
        "Slide (×2)",
      );
    });

    test("displays item prices for hire items", async () => {
      await setupDOM([
        cartItem({
          item_name: "Castle",
          hire_prices: { 1: "£50", 2: "£90" },
        }),
      ]);
      updateQuotePrice(2);
      const itemPrice = document.querySelector(
        '[data-field="items"] > li [data-field="price"]',
      );
      expect(itemPrice.textContent).toBe("£90");
    });

    test("multiplies hire price by quantity", async () => {
      await setupDOM([
        cartItem({
          item_name: "Chair",
          hire_prices: { 1: "£10" },
          quantity: 3,
        }),
      ]);
      updateQuotePrice(1);
      const itemPrice = document.querySelector(
        '[data-field="items"] > li [data-field="price"]',
      );
      expect(itemPrice.textContent).toBe("£30");
    });

    test("displays TBC for item when price unavailable for day count", async () => {
      await setupDOM([cartItem({ hire_prices: { 1: "£20" } })]);
      updateQuotePrice(5); // No price for 5 days
      const itemPrice = document.querySelector(
        '[data-field="items"] > li [data-field="price"]',
      );
      expect(itemPrice.textContent).toBe("TBC");
    });

    test("calculates and displays total price", async () => {
      await setupDOM([
        cartItem({ item_name: "Item A", hire_prices: { 1: "£20" } }),
        cartItem({ item_name: "Item B", hire_prices: { 1: "£30" } }),
      ]);
      updateQuotePrice(1);
      expect(document.querySelector('[data-field="total"]').textContent).toBe(
        "£50",
      );
    });

    test("displays TBC for total when any price unavailable", async () => {
      await setupDOM([
        cartItem({ item_name: "Item A", hire_prices: { 1: "£20" } }),
        cartItem({ item_name: "Item B", hire_prices: { 2: "£30" } }), // No day 1 price
      ]);
      updateQuotePrice(1);
      expect(document.querySelector('[data-field="total"]').textContent).toBe(
        "TBC",
      );
    });

    test("displays item count with correct pluralization", async () => {
      await setupDOM([
        cartItem({ item_name: "Item A", quantity: 2 }),
        cartItem({ item_name: "Item B", hire_prices: { 1: "£25" } }),
      ]);
      updateQuotePrice(1);
      expect(
        document.querySelector('[data-field="item-count"]').textContent,
      ).toBe("3 items in order");
    });

    test("displays singular item count for 1 item", async () => {
      await setupDOM([cartItem({ item_name: "Single Item" })]);
      updateQuotePrice(1);
      expect(
        document.querySelector('[data-field="item-count"]').textContent,
      ).toBe("1 item in order");
    });

    test("displays hire length with correct pluralization", async () => {
      await setupDOM([cartItem({ hire_prices: { 3: "£50" } })]);
      updateQuotePrice(3);
      expect(
        document.querySelector('[data-field="hire-length"]').textContent,
      ).toBe("3 days");
    });

    test("displays singular day for 1 day hire", async () => {
      await setupDOM([cartItem()]);
      updateQuotePrice(1);
      expect(
        document.querySelector('[data-field="hire-length"]').textContent,
      ).toBe("1 day");
    });

    test("handles non-hire items with unit_price", async () => {
      await setupDOM([
        buyItem({ item_name: "Purchase Item", unit_price: 25, quantity: 3 }),
      ]);
      updateQuotePrice(1);

      const itemPrice = document.querySelector(
        '[data-field="items"] > li [data-field="price"]',
      );
      expect(itemPrice.textContent).toBe("£75");
      expect(document.querySelector('[data-field="total"]').textContent).toBe(
        "£75",
      );
    });

    test("handles mixed hire and buy items", async () => {
      await setupDOM([
        cartItem({ item_name: "Hire Item" }),
        buyItem({ item_name: "Buy Item", unit_price: 25, quantity: 2 }),
      ]);
      updateQuotePrice(1);
      expect(document.querySelector('[data-field="total"]').textContent).toBe(
        "£100",
      ); // 50 + 25*2
    });

    test("renders field details from text inputs", async () => {
      await setupDOM(
        [buyItem()],
        `<input id="name" name="name" type="text" value="John Doe" />
         <input id="email" name="email" type="email" value="john@example.com" />`,
      );
      updateQuotePrice(1);

      const details = getDetails();
      expect(details).toHaveLength(2);
      expect(getDetailKey(details[0])).toBe("Your Name");
      expect(getDetailValue(details[0])).toBe("John Doe");
    });

    test("excludes empty input fields from details", async () => {
      await setupDOM(
        [buyItem()],
        `<input id="name" name="name" type="text" value="" />
         <input id="email" name="email" type="email" value="test@example.com" />`,
      );
      updateQuotePrice(1);

      const details = getDetails();
      expect(details).toHaveLength(1);
      expect(getDetailKey(details[0])).toBe("Email");
    });

    test("renders checked radio button value in details", async () => {
      await setupDOM(
        [buyItem()],
        `<input type="radio" name="contact" value="Email" checked />
         <input type="radio" name="contact" value="Phone" />`,
      );
      updateQuotePrice(1);

      const details = getDetails();
      expect(details).toHaveLength(1);
      expect(getDetailKey(details[0])).toBe("Preferred Contact");
      expect(getDetailValue(details[0])).toBe("Email");
    });

    test("excludes unchecked radio groups from details", async () => {
      await setupDOM(
        [buyItem()],
        `<input type="radio" name="contact" value="Email" />
         <input type="radio" name="contact" value="Phone" />`,
      );
      updateQuotePrice(1);
      expect(getDetails()).toHaveLength(0);
    });

    test("renders select field display text in details", async () => {
      await setupDOM(
        [buyItem()],
        `<select id="event_type" name="event_type">
           <option value="">Choose...</option>
           <option value="wedding" selected>Wedding</option>
         </select>`,
      );
      updateQuotePrice(1);

      const details = getDetails();
      expect(details).toHaveLength(1);
      expect(getDetailValue(details[0])).toBe("Wedding");
    });

    test("renders textarea value in details", async () => {
      await setupDOM(
        [buyItem()],
        `<textarea id="message" name="message">Hello World</textarea>`,
      );
      updateQuotePrice(1);

      const details = getDetails();
      expect(details).toHaveLength(1);
      expect(getDetailValue(details[0])).toBe("Hello World");
    });

    test("excludes empty textarea from details", async () => {
      await setupDOM(
        [buyItem()],
        `<textarea id="message" name="message"></textarea>`,
      );
      updateQuotePrice(1);
      expect(getDetails()).toHaveLength(0);
    });

    test("uses quote-steps container for field details when available", async () => {
      const templates = await renderQuotePriceTemplates();
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([buyItem()]));
      document.body.innerHTML = `
        <script id="site-config" type="application/json">{"currency":"GBP"}</script>
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
      expect(getDetailValue(getDetails()[0])).toBe("Quote Steps Name");
    });

    test("hides details section when no filled fields", async () => {
      await setupDOM([buyItem()], `<input id="name" name="name" value="" />`);
      updateQuotePrice(1);
      const detailsParent = document.querySelector(
        '[data-field="details"]',
      ).parentElement;
      expect(detailsParent.style.display).toBe("none");
    });
  });

  // ----------------------------------------
  // setupDetailsBlurHandlers Tests
  // ----------------------------------------
  describe("setupDetailsBlurHandlers", () => {
    const setupBlurTestDOM = (formHtml, useQuoteSteps = false) => {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([]));
      const containerHtml = useQuoteSteps
        ? `<div class="quote-steps">${formHtml}</div>`
        : `<form>${formHtml}</form>`;
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{}</script>
        ${containerHtml}
        <div id="quote-price"></div>
      `;
    };

    // Helper to test that an event triggers getDays callback
    // selector: plain ID string (e.g. "name") or CSS selector (e.g. 'input[type="radio"]')
    const testEventTriggersDays = (selector, eventType, getDaysMock) => {
      const isPlainId = /^[a-zA-Z_][\w-]*$/.test(selector);
      const element = isPlainId
        ? document.getElementById(selector)
        : document.querySelector(selector);
      element.dispatchEvent(new Event(eventType, { bubbles: true }));
      expect(getDaysMock).toHaveBeenCalled();
    };

    test("attaches blur handler to form fields", () => {
      setupBlurTestDOM('<input id="name" type="text" />');
      const getDays = mock(() => 1);
      setupDetailsBlurHandlers(getDays);
      testEventTriggersDays("name", "blur", getDays);
    });

    test("attaches change handler for radio buttons", () => {
      setupBlurTestDOM(`
        <input type="radio" name="pref" value="A" />
        <input type="radio" name="pref" value="B" />
      `);
      const getDays = mock(() => 2);
      setupDetailsBlurHandlers(getDays);
      testEventTriggersDays('input[type="radio"]', "change", getDays);
    });

    test("attaches change handler for select elements", () => {
      setupBlurTestDOM(`<select id="event"><option>A</option></select>`);
      const getDays = mock(() => 3);
      setupDetailsBlurHandlers(getDays);
      testEventTriggersDays("event", "change", getDays);
    });

    test("uses quote-steps container if available", () => {
      setupBlurTestDOM('<input id="name" type="text" />', true);
      const getDays = mock(() => 1);
      setupDetailsBlurHandlers(getDays);
      testEventTriggersDays("name", "blur", getDays);
    });

    test("does nothing when no form container exists", () => {
      document.body.innerHTML = "<div>No form</div>";
      expect(() => setupDetailsBlurHandlers(() => 1)).not.toThrow();
    });
  });
});
