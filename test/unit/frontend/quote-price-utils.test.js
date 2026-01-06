// Quote price utilities tests
// Tests the field details collection and display functions

import { describe, expect, mock, test } from "bun:test";
import {
  calculateTotal,
  collectFieldDetails,
  countItems,
  formatHireLength,
  formatItemCount,
  formatItemName,
  formatItemPrice,
  getFieldLabel,
  getFieldValue,
  getPriceForDays,
  parsePrice,
  setupDetailsBlurHandlers,
  updateQuotePrice,
} from "#public/utils/quote-price-utils.js";

describe("quote-price-utils", () => {
  // ----------------------------------------
  // parsePrice Tests
  // ----------------------------------------
  describe("parsePrice", () => {
    test("returns number as-is", () => {
      expect(parsePrice(10)).toBe(10);
      expect(parsePrice(99.99)).toBe(99.99);
    });

    test("parses price string with currency symbol", () => {
      expect(parsePrice("£10.00")).toBe(10);
      expect(parsePrice("$25.50")).toBe(25.5);
    });

    test("returns 0 for empty/falsy values", () => {
      expect(parsePrice("")).toBe(0);
      expect(parsePrice(null)).toBe(0);
      expect(parsePrice(undefined)).toBe(0);
    });

    test("extracts first numeric value from string", () => {
      expect(parsePrice("Price: 15.00")).toBe(15);
    });

    test("returns 0 for non-numeric string", () => {
      expect(parsePrice("no numbers")).toBe(0);
    });
  });

  // ----------------------------------------
  // getPriceForDays Tests
  // ----------------------------------------
  describe("getPriceForDays", () => {
    test("returns unit_price * quantity for non-hire items", () => {
      const item = { product_mode: "buy", unit_price: 10, quantity: 2 };
      expect(getPriceForDays(1)(item)).toBe(20);
    });

    test("returns hire price for hire items", () => {
      const item = {
        product_mode: "hire",
        hire_prices: { 1: "£10", 2: "£18" },
        quantity: 1,
      };
      expect(getPriceForDays(1)(item)).toBe(10);
      expect(getPriceForDays(2)(item)).toBe(18);
    });

    test("multiplies hire price by quantity", () => {
      const item = {
        product_mode: "hire",
        hire_prices: { 1: "£10" },
        quantity: 3,
      };
      expect(getPriceForDays(1)(item)).toBe(30);
    });

    test("returns null when hire price not available for day count", () => {
      const item = {
        product_mode: "hire",
        hire_prices: { 1: "£10" },
        quantity: 1,
      };
      expect(getPriceForDays(5)(item)).toBe(null);
    });
  });

  // ----------------------------------------
  // formatItemName Tests
  // ----------------------------------------
  describe("formatItemName", () => {
    test("returns item name for quantity 1", () => {
      expect(formatItemName({ item_name: "Bouncy Castle", quantity: 1 })).toBe(
        "Bouncy Castle",
      );
    });

    test("appends quantity for quantity > 1", () => {
      expect(formatItemName({ item_name: "Chair", quantity: 5 })).toBe(
        "Chair (×5)",
      );
    });
  });

  // ----------------------------------------
  // formatItemPrice Tests
  // ----------------------------------------
  describe("formatItemPrice", () => {
    test("returns TBC for null price", () => {
      expect(formatItemPrice(null)).toBe("TBC");
    });

    test("formats numeric price", () => {
      // formatPrice from cart-utils adds currency formatting
      const result = formatItemPrice(10);
      expect(result).toContain("10");
    });
  });

  // ----------------------------------------
  // calculateTotal Tests
  // ----------------------------------------
  describe("calculateTotal", () => {
    test("calculates total for non-hire items", () => {
      const cart = [
        { product_mode: "buy", unit_price: 10, quantity: 1 },
        { product_mode: "buy", unit_price: 20, quantity: 2 },
      ];
      const result = calculateTotal(cart, 1);
      expect(result.total).toBe(50);
      expect(result.canCalculate).toBe(true);
    });

    test("calculates total for hire items", () => {
      const cart = [
        { product_mode: "hire", hire_prices: { 1: "£10" }, quantity: 1 },
        { product_mode: "hire", hire_prices: { 1: "£20" }, quantity: 1 },
      ];
      const result = calculateTotal(cart, 1);
      expect(result.total).toBe(30);
      expect(result.canCalculate).toBe(true);
    });

    test("returns canCalculate false when price unavailable", () => {
      const cart = [
        { product_mode: "hire", hire_prices: { 1: "£10" }, quantity: 1 },
      ];
      const result = calculateTotal(cart, 5);
      expect(result.canCalculate).toBe(false);
      expect(result.total).toBe(0);
    });

    test("returns zero total for empty cart", () => {
      const result = calculateTotal([], 1);
      expect(result.total).toBe(0);
      expect(result.canCalculate).toBe(true);
    });
  });

  // ----------------------------------------
  // formatHireLength Tests
  // ----------------------------------------
  describe("formatHireLength", () => {
    test("returns singular for 1 day", () => {
      expect(formatHireLength(1)).toBe("1 day");
    });

    test("returns plural for multiple days", () => {
      expect(formatHireLength(2)).toBe("2 days");
      expect(formatHireLength(7)).toBe("7 days");
    });
  });

  // ----------------------------------------
  // formatItemCount Tests
  // ----------------------------------------
  describe("formatItemCount", () => {
    test("returns singular for 1 item", () => {
      expect(formatItemCount(1)).toBe("1 item in order");
    });

    test("returns plural for multiple items", () => {
      expect(formatItemCount(3)).toBe("3 items in order");
    });
  });

  // ----------------------------------------
  // countItems Tests
  // ----------------------------------------
  describe("countItems", () => {
    test("counts single item", () => {
      expect(countItems([{ quantity: 1 }])).toBe(1);
    });

    test("sums quantities across items", () => {
      expect(countItems([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
    });

    test("returns 0 for empty cart", () => {
      expect(countItems([])).toBe(0);
    });
  });

  // ----------------------------------------
  // updateQuotePrice Tests (with DOM)
  // ----------------------------------------
  describe("updateQuotePrice", () => {
    test("does nothing when container not found", () => {
      document.body.innerHTML = "<div>No container</div>";
      expect(() => updateQuotePrice()).not.toThrow();
    });
  });

  // ----------------------------------------
  // getFieldValue Tests (with DOM)
  // ----------------------------------------
  describe("getFieldValue", () => {
    test("returns value for text input", () => {
      document.body.innerHTML = '<input type="text" id="name" value="John" />';
      const field = document.getElementById("name");
      expect(getFieldValue(field)).toBe("John");
    });

    test("returns empty string for empty input", () => {
      document.body.innerHTML = '<input type="text" id="name" value="" />';
      const field = document.getElementById("name");
      expect(getFieldValue(field)).toBe("");
    });

    test("returns checked radio value", () => {
      document.body.innerHTML = `
        <input type="radio" name="pref" value="A" />
        <input type="radio" name="pref" value="B" checked />
      `;
      const field = document.querySelector('input[type="radio"]');
      expect(getFieldValue(field)).toBe("B");
    });

    test("returns empty string for unchecked radio group", () => {
      document.body.innerHTML = `
        <input type="radio" name="pref" value="A" />
        <input type="radio" name="pref" value="B" />
      `;
      const field = document.querySelector('input[type="radio"]');
      expect(getFieldValue(field)).toBe("");
    });

    test("returns selected option text for select", () => {
      document.body.innerHTML = `
        <select id="event_type">
          <option value="">Choose...</option>
          <option value="wedding" selected>Wedding</option>
        </select>
      `;
      const field = document.getElementById("event_type");
      expect(getFieldValue(field)).toBe("Wedding");
    });

    test("returns first option text when no selection", () => {
      document.body.innerHTML = `
        <select id="event_type">
          <option value="">Choose...</option>
        </select>
      `;
      const field = document.getElementById("event_type");
      expect(getFieldValue(field)).toBe("Choose...");
    });

    test("returns value for textarea", () => {
      document.body.innerHTML = '<textarea id="message">Hello World</textarea>';
      const field = document.getElementById("message");
      expect(getFieldValue(field)).toBe("Hello World");
    });
  });

  // ----------------------------------------
  // getFieldLabel Tests (with config mapping)
  // ----------------------------------------
  describe("getFieldLabel", () => {
    test("returns label from config for text field", () => {
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{"name": "Your Name"}</script>
        <input id="name" name="name" type="text" />
      `;
      const field = document.getElementById("name");
      expect(getFieldLabel(field)).toBe("Your Name");
    });

    test("returns label for radio button by name", () => {
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{"contact": "Contact Preference"}</script>
        <input type="radio" name="contact" value="Email" />
      `;
      const field = document.querySelector('input[type="radio"]');
      expect(getFieldLabel(field)).toBe("Contact Preference");
    });

    // Note: No tests for missing config script or unknown fields
    // The config script always exists and contains all field labels
  });

  // ----------------------------------------
  // collectFieldDetails Tests (with config mapping)
  // ----------------------------------------
  describe("collectFieldDetails", () => {
    test("collects details from text inputs with values", () => {
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{"name": "Your Name"}</script>
        <div class="container">
          <input id="name" name="name" type="text" value="John Doe" />
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([{ key: "Your Name", value: "John Doe" }]);
    });

    test("excludes empty fields", () => {
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{"name": "Your Name", "email": "Email"}</script>
        <div class="container">
          <input id="name" name="name" type="text" value="" />
          <input id="email" name="email" type="text" value="test@example.com" />
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([{ key: "Email", value: "test@example.com" }]);
    });

    test("collects multiple filled fields in order", () => {
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{"name": "Your Name", "email": "Email", "phone": "Phone"}</script>
        <div class="container">
          <input id="name" name="name" type="text" value="Jane" />
          <input id="email" name="email" type="email" value="jane@test.com" />
          <input id="phone" name="phone" type="tel" value="555-1234" />
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([
        { key: "Your Name", value: "Jane" },
        { key: "Email", value: "jane@test.com" },
        { key: "Phone", value: "555-1234" },
      ]);
    });

    test("collects checked radio value", () => {
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{"contact": "Preferred Contact"}</script>
        <div class="container">
          <input type="radio" name="contact" value="Email" checked />
          <input type="radio" name="contact" value="Phone" />
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([{ key: "Preferred Contact", value: "Email" }]);
    });

    test("excludes unchecked radio groups", () => {
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{"contact": "Preferred Contact"}</script>
        <div class="container">
          <input type="radio" name="contact" value="Email" />
          <input type="radio" name="contact" value="Phone" />
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([]);
    });

    test("deduplicates radio buttons by name", () => {
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{"pref": "Preference"}</script>
        <div class="container">
          <input type="radio" name="pref" value="A" checked />
          <input type="radio" name="pref" value="B" />
          <input type="radio" name="pref" value="C" />
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details.length).toBe(1);
      expect(details[0]).toEqual({ key: "Preference", value: "A" });
    });

    test("collects select field value", () => {
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{"event_type": "Event Type"}</script>
        <div class="container">
          <select id="event_type" name="event_type">
            <option value="">Choose...</option>
            <option value="wedding" selected>Wedding</option>
          </select>
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([{ key: "Event Type", value: "Wedding" }]);
    });

    test("collects textarea value", () => {
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{"message": "Message"}</script>
        <div class="container">
          <textarea id="message" name="message">Hello there</textarea>
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([{ key: "Message", value: "Hello there" }]);
    });

    test("excludes empty textarea", () => {
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{"message": "Message"}</script>
        <div class="container">
          <textarea id="message" name="message"></textarea>
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([]);
    });

    test("returns empty array for container with no fields", () => {
      document.body.innerHTML = '<div class="container"><p>No fields</p></div>';
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([]);
    });

    test("collects mixed field types", () => {
      document.body.innerHTML = `
        <script class="quote-field-labels" type="application/json">{"name": "Name", "event": "Event", "contact": "Contact", "notes": "Notes"}</script>
        <div class="container">
          <input id="name" name="name" type="text" value="John" />
          <select id="event" name="event">
            <option value="">Choose...</option>
            <option value="party" selected>Party</option>
          </select>
          <input type="radio" name="contact" value="Email" checked />
          <textarea id="notes" name="notes">Some notes</textarea>
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([
        { key: "Name", value: "John" },
        { key: "Event", value: "Party" },
        { key: "Contact", value: "Email" },
        { key: "Notes", value: "Some notes" },
      ]);
    });
  });

  // ----------------------------------------
  // setupDetailsBlurHandlers Tests (with DOM)
  // ----------------------------------------
  describe("setupDetailsBlurHandlers", () => {
    // Note: We trust form container always exists on quote pages
    // No test for missing container - that would be a template bug

    test("attaches blur handler to form container", () => {
      document.body.innerHTML = `
        <form>
          <input id="name" type="text" />
        </form>
        <div id="quote-price-container"></div>
      `;
      const getDays = mock(() => 1);
      setupDetailsBlurHandlers(getDays);
      const field = document.getElementById("name");

      // Trigger blur event
      field.dispatchEvent(new FocusEvent("blur", { bubbles: false }));

      // getDays should have been called
      expect(getDays).toHaveBeenCalled();
    });

    test("attaches change handler for radio buttons", () => {
      document.body.innerHTML = `
        <form>
          <input type="radio" name="pref" value="A" />
          <input type="radio" name="pref" value="B" />
        </form>
        <div id="quote-price-container"></div>
      `;
      const getDays = mock(() => 2);
      setupDetailsBlurHandlers(getDays);
      const radio = document.querySelector('input[type="radio"]');

      // Trigger change event
      radio.dispatchEvent(new Event("change", { bubbles: true }));

      expect(getDays).toHaveBeenCalled();
    });

    test("attaches change handler for select elements", () => {
      document.body.innerHTML = `
        <form>
          <select id="event">
            <option value="a">A</option>
            <option value="b">B</option>
          </select>
        </form>
        <div id="quote-price-container"></div>
      `;
      const getDays = mock(() => 3);
      setupDetailsBlurHandlers(getDays);
      const select = document.getElementById("event");

      // Trigger change event
      select.dispatchEvent(new Event("change", { bubbles: true }));

      expect(getDays).toHaveBeenCalled();
    });

    test("uses quote-steps container if available", () => {
      document.body.innerHTML = `
        <div class="quote-steps">
          <input id="name" type="text" />
        </div>
        <div id="quote-price-container"></div>
      `;
      const getDays = mock(() => 1);
      setupDetailsBlurHandlers(getDays);
      const field = document.getElementById("name");

      field.dispatchEvent(new FocusEvent("blur", { bubbles: false }));

      expect(getDays).toHaveBeenCalled();
    });
  });
});
