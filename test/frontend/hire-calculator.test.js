// Hire Calculator Tests
// Tests the hire-calculator.js functions for date calculation and pricing

import { beforeEach, describe, expect, test } from "bun:test";
import { STORAGE_KEY } from "#assets/cart-utils.js";
import {
  calculateDays,
  calculateHireTotal,
  formatHireMessage,
  getHireItems,
  handleDateChange,
  hasHireItems,
  initHireCalculator,
  isHireItem,
  parsePrice,
  resetHireCalculator,
  setMinDate,
} from "#assets/hire-calculator.js";

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

describe("hire-calculator", () => {
  // Reset state before each test
  beforeEach(() => {
    resetHireCalculator();
  });
  // ----------------------------------------
  // parsePrice Tests
  // ----------------------------------------
  test("parsePrice returns the number unchanged if input is numeric", () => {
    expect(parsePrice(50)).toBe(50);
    expect(parsePrice(19.99)).toBe(19.99);
    expect(parsePrice(0)).toBe(0);
  });

  test("parsePrice extracts numeric value from currency strings", () => {
    expect(parsePrice("£50")).toBe(50);
    expect(parsePrice("£19.99")).toBe(19.99);
    expect(parsePrice("$100.50")).toBe(100.5);
  });

  test("parsePrice extracts number from 'from £X' strings", () => {
    expect(parsePrice("from £30")).toBe(30);
    expect(parsePrice("From £45.50")).toBe(45.5);
  });

  test("parsePrice extracts number from strings with /day suffix", () => {
    expect(parsePrice("£25/day")).toBe(25);
    expect(parsePrice("£35.00 per day")).toBe(35);
  });

  test("parsePrice returns 0 for null, undefined, or empty string", () => {
    expect(parsePrice(null)).toBe(0);
    expect(parsePrice(undefined)).toBe(0);
    expect(parsePrice("")).toBe(0);
  });

  test("parsePrice returns 0 for strings with no numbers", () => {
    expect(parsePrice("free")).toBe(0);
    expect(parsePrice("POA")).toBe(0);
  });

  // ----------------------------------------
  // calculateDays Tests
  // ----------------------------------------
  test("calculateDays returns 1 when start and end are same day", () => {
    expect(calculateDays("2025-01-15", "2025-01-15")).toBe(1);
  });

  test("calculateDays counts days inclusive of start and end", () => {
    expect(calculateDays("2025-01-15", "2025-01-17")).toBe(3);
    expect(calculateDays("2025-01-01", "2025-01-05")).toBe(5);
  });

  test("calculateDays works across month boundaries", () => {
    expect(calculateDays("2025-01-30", "2025-02-02")).toBe(4);
  });

  test("calculateDays returns 0 when end is before start", () => {
    expect(calculateDays("2025-01-20", "2025-01-15")).toBe(0);
  });

  // ----------------------------------------
  // hasHireItems Tests
  // ----------------------------------------
  test("hasHireItems returns true if any item has product_mode hire", () => {
    const cart = [
      { item_name: "Widget", product_mode: "buy" },
      { item_name: "Doggy Care", product_mode: "hire" },
    ];
    expect(hasHireItems(cart)).toBe(true);
  });

  test("hasHireItems returns false if no items have hire mode", () => {
    const cart = [
      { item_name: "Widget", product_mode: "buy" },
      { item_name: "Gadget", product_mode: null },
    ];
    expect(hasHireItems(cart)).toBe(false);
  });

  test("hasHireItems returns false for empty cart", () => {
    expect(hasHireItems([])).toBe(false);
  });

  // ----------------------------------------
  // getHireItems Tests
  // ----------------------------------------
  test("getHireItems returns only items with product_mode hire", () => {
    const cart = [
      { item_name: "Widget", product_mode: "buy" },
      { item_name: "Doggy Care", product_mode: "hire" },
      { item_name: "Gadget", product_mode: null },
      { item_name: "Equipment", product_mode: "hire" },
    ];
    const hireItems = getHireItems(cart);
    expect(hireItems).toHaveLength(2);
    expect(hireItems[0].item_name).toBe("Doggy Care");
    expect(hireItems[1].item_name).toBe("Equipment");
  });

  test("getHireItems returns empty array when no hire items", () => {
    const cart = [{ item_name: "Widget", product_mode: "buy" }];
    const hireItems = getHireItems(cart);
    expect(hireItems).toHaveLength(0);
  });

  // ----------------------------------------
  // calculateHireTotal Tests
  // ----------------------------------------
  test("calculateHireTotal multiplies price by quantity for a day", () => {
    const cart = [
      {
        item_name: "Doggy Care",
        product_mode: "hire",
        quantity: 2,
        hire_prices: { 1: "£30", 2: "£45", 3: "£55" },
      },
    ];
    const result = calculateHireTotal(cart, 2);
    expect(result.canCalculate).toBe(true);
    expect(result.total).toBe(90);
  });

  test("calculateHireTotal sums totals across multiple hire items", () => {
    const cart = [
      {
        item_name: "Doggy Care",
        product_mode: "hire",
        quantity: 1,
        hire_prices: { 1: "£30", 2: "£45" },
      },
      {
        item_name: "Equipment",
        product_mode: "hire",
        quantity: 1,
        hire_prices: { 1: "£50", 2: "£80" },
      },
      { item_name: "Widget", product_mode: "buy", quantity: 1 },
    ];
    const result = calculateHireTotal(cart, 2);
    expect(result.canCalculate).toBe(true);
    expect(result.total).toBe(125);
  });

  test("calculateHireTotal returns canCalculate false when price unavailable", () => {
    const cart = [
      {
        item_name: "Doggy Care",
        product_mode: "hire",
        quantity: 1,
        hire_prices: { 1: "£30", 2: "£45" },
      },
    ];
    const result = calculateHireTotal(cart, 5);
    expect(result.canCalculate).toBe(false);
    expect(result.total).toBe(0);
  });

  test("calculateHireTotal returns canCalculate false for 0 days", () => {
    const cart = [
      {
        item_name: "Doggy Care",
        product_mode: "hire",
        quantity: 1,
        hire_prices: { 1: "£30" },
      },
    ];
    const result = calculateHireTotal(cart, 0);
    expect(result.canCalculate).toBe(false);
  });

  test("calculateHireTotal returns canCalculate false for empty cart", () => {
    const result = calculateHireTotal([], 3);
    expect(result.canCalculate).toBe(false);
  });

  test("calculateHireTotal only includes hire items in total", () => {
    const cart = [
      {
        item_name: "Hire Item",
        product_mode: "hire",
        quantity: 1,
        hire_prices: { 1: "£100" },
      },
      {
        item_name: "Buy Item",
        product_mode: "buy",
        quantity: 10,
        unit_price: 50,
      },
    ];
    const result = calculateHireTotal(cart, 1);
    expect(result.canCalculate).toBe(true);
    expect(result.total).toBe(100);
  });

  test("calculateHireTotal handles numeric prices in hire_prices", () => {
    const cart = [
      {
        item_name: "Equipment",
        product_mode: "hire",
        quantity: 3,
        hire_prices: { 1: 40, 2: 70 },
      },
    ];
    const result = calculateHireTotal(cart, 1);
    expect(result.canCalculate).toBe(true);
    expect(result.total).toBe(120);
  });

  // ----------------------------------------
  // formatHireMessage Tests
  // ----------------------------------------
  test("formatHireMessage shows estimated total when canCalculate is true", () => {
    const message = formatHireMessage(3, 150, true);
    expect(message).toBe("Estimated total for 3 days: £150.00");
  });

  test("formatHireMessage uses singular 'day' for 1 day", () => {
    const message = formatHireMessage(1, 50, true);
    expect(message).toBe("Estimated total for 1 day: £50.00");
  });

  test("formatHireMessage shows quote message when canCalculate is false", () => {
    const message = formatHireMessage(5, 0, false);
    expect(message).toBe("We'll provide an exact quote for your 5 day hire.");
  });

  test("formatHireMessage handles various day counts", () => {
    expect(formatHireMessage(2, 100, true)).toContain("2 days");
    expect(formatHireMessage(7, 350, true)).toContain("7 days");
    expect(formatHireMessage(14, 700, true)).toContain("14 days");
  });

  // ----------------------------------------
  // isHireItem Tests
  // ----------------------------------------
  test("isHireItem returns true for hire mode items", () => {
    expect(isHireItem({ product_mode: "hire" })).toBe(true);
  });

  test("isHireItem returns false for buy mode items", () => {
    expect(isHireItem({ product_mode: "buy" })).toBe(false);
  });

  test("isHireItem returns false for null product_mode", () => {
    expect(isHireItem({ product_mode: null })).toBe(false);
  });

  test("isHireItem returns false for undefined product_mode", () => {
    expect(isHireItem({})).toBe(false);
  });

  // ----------------------------------------
  // setMinDate Tests (with DOM)
  // ----------------------------------------
  test("setMinDate sets min attribute to today's date", () => {
    document.body.innerHTML = '<input type="date" id="test-date" />';
    const input = document.getElementById("test-date");

    setMinDate(input);

    const today = new Date().toISOString().split("T")[0];
    expect(input.min).toBe(today);
  });

  test("setMinDate works on multiple inputs", () => {
    document.body.innerHTML = `
      <input type="date" id="start" />
      <input type="date" id="end" />
    `;
    const startInput = document.getElementById("start");
    const endInput = document.getElementById("end");

    setMinDate(startInput);
    setMinDate(endInput);

    const today = new Date().toISOString().split("T")[0];
    expect(startInput.min).toBe(today);
    expect(endInput.min).toBe(today);
  });

  // ----------------------------------------
  // handleDateChange Tests (with DOM and localStorage)
  // ----------------------------------------
  test("handleDateChange hides total when start date is missing", () => {
    withMockStorage((storage) => {
      document.body.innerHTML = `
        <input type="date" name="start_date" value="" />
        <input type="date" name="end_date" value="2025-01-20" />
        <div id="hire-total" style="display: block;">Old content</div>
        <input type="hidden" id="hire_days" value="5" />
      `;
      const elements = {
        startInput: document.querySelector('input[name="start_date"]'),
        endInput: document.querySelector('input[name="end_date"]'),
        totalEl: document.getElementById("hire-total"),
        daysInput: document.getElementById("hire_days"),
      };

      handleDateChange(elements)();

      expect(elements.totalEl.style.display).toBe("none");
      expect(elements.daysInput.value).toBe("");
    });
  });

  test("handleDateChange hides total when end date is missing", () => {
    withMockStorage((storage) => {
      document.body.innerHTML = `
        <input type="date" name="start_date" value="2025-01-15" />
        <input type="date" name="end_date" value="" />
        <div id="hire-total" style="display: block;">Old content</div>
        <input type="hidden" id="hire_days" value="5" />
      `;
      const elements = {
        startInput: document.querySelector('input[name="start_date"]'),
        endInput: document.querySelector('input[name="end_date"]'),
        totalEl: document.getElementById("hire-total"),
        daysInput: document.getElementById("hire_days"),
      };

      handleDateChange(elements)();

      expect(elements.totalEl.style.display).toBe("none");
      expect(elements.daysInput.value).toBe("");
    });
  });

  test("handleDateChange shows total with days count when both dates set", () => {
    withMockStorage((storage) => {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          {
            item_name: "Equipment",
            product_mode: "hire",
            quantity: 1,
            hire_prices: { 1: "£50", 2: "£80", 3: "£100" },
          },
        ]),
      );

      document.body.innerHTML = `
        <input type="date" name="start_date" value="2025-01-15" />
        <input type="date" name="end_date" value="2025-01-17" />
        <div id="hire-total" style="display: none;"></div>
        <input type="hidden" id="hire_days" value="" />
      `;
      const elements = {
        startInput: document.querySelector('input[name="start_date"]'),
        endInput: document.querySelector('input[name="end_date"]'),
        totalEl: document.getElementById("hire-total"),
        daysInput: document.getElementById("hire_days"),
      };

      handleDateChange(elements)();

      expect(elements.totalEl.style.display).toBe("block");
      expect(elements.daysInput.value).toBe("3");
      expect(elements.totalEl.textContent).toContain("3 days");
      expect(elements.totalEl.textContent).toContain("£100.00");
    });
  });

  test("handleDateChange shows quote message when price unavailable", () => {
    withMockStorage((storage) => {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          {
            item_name: "Equipment",
            product_mode: "hire",
            quantity: 1,
            hire_prices: { 1: "£50", 2: "£80" },
          },
        ]),
      );

      document.body.innerHTML = `
        <input type="date" name="start_date" value="2025-01-15" />
        <input type="date" name="end_date" value="2025-01-19" />
        <div id="hire-total" style="display: none;"></div>
        <input type="hidden" id="hire_days" value="" />
      `;
      const elements = {
        startInput: document.querySelector('input[name="start_date"]'),
        endInput: document.querySelector('input[name="end_date"]'),
        totalEl: document.getElementById("hire-total"),
        daysInput: document.getElementById("hire_days"),
      };

      handleDateChange(elements)();

      expect(elements.totalEl.style.display).toBe("block");
      expect(elements.daysInput.value).toBe("5");
      expect(elements.totalEl.textContent).toContain("quote");
    });
  });

  // ----------------------------------------
  // initHireCalculator Tests (with DOM and localStorage)
  // ----------------------------------------
  test("initHireCalculator does nothing when start input missing", () => {
    withMockStorage(() => {
      document.body.innerHTML = `
        <input type="date" name="end_date" />
        <div id="hire-total"></div>
      `;
      expect(() => initHireCalculator()).not.toThrow();
    });
  });

  test("initHireCalculator does nothing when end input missing", () => {
    withMockStorage(() => {
      document.body.innerHTML = `
        <input type="date" name="start_date" />
        <div id="hire-total"></div>
      `;
      expect(() => initHireCalculator()).not.toThrow();
    });
  });

  test("initHireCalculator does nothing when total element missing", () => {
    withMockStorage(() => {
      document.body.innerHTML = `
        <input type="date" name="start_date" />
        <input type="date" name="end_date" />
      `;
      expect(() => initHireCalculator()).not.toThrow();
    });
  });

  test("initHireCalculator does nothing when cart has no hire items", () => {
    withMockStorage((storage) => {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify([{ item_name: "Widget", product_mode: "buy" }]),
      );

      document.body.innerHTML = `
        <input type="date" name="start_date" />
        <input type="date" name="end_date" />
        <div id="hire-total"></div>
        <input type="hidden" id="hire_days" />
      `;

      initHireCalculator();

      // Verify min date was not set (init exited early)
      const startInput = document.querySelector('input[name="start_date"]');
      expect(startInput.min).toBe("");
    });
  });

  test("initHireCalculator sets min dates when cart has hire items", () => {
    withMockStorage((storage) => {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify([{ item_name: "Equipment", product_mode: "hire" }]),
      );

      document.body.innerHTML = `
        <input type="date" name="start_date" />
        <input type="date" name="end_date" />
        <div id="hire-total"></div>
        <input type="hidden" id="hire_days" />
      `;

      initHireCalculator();

      const startInput = document.querySelector('input[name="start_date"]');
      const endInput = document.querySelector('input[name="end_date"]');
      const today = new Date().toISOString().split("T")[0];
      expect(startInput.min).toBe(today);
      expect(endInput.min).toBe(today);
    });
  });

  test("initHireCalculator updates end min when start date changes", () => {
    withMockStorage((storage) => {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          {
            item_name: "Equipment",
            product_mode: "hire",
            quantity: 1,
            hire_prices: { 1: "£50" },
          },
        ]),
      );

      document.body.innerHTML = `
        <input type="date" name="start_date" />
        <input type="date" name="end_date" />
        <div id="hire-total"></div>
        <input type="hidden" id="hire_days" />
      `;

      initHireCalculator();

      const startInput = document.querySelector('input[name="start_date"]');
      const endInput = document.querySelector('input[name="end_date"]');

      // Simulate setting start date and triggering change
      startInput.value = "2025-02-15";
      startInput.dispatchEvent(new Event("change"));

      expect(endInput.min).toBe("2025-02-15");
    });
  });

  test("initHireCalculator adjusts end date when it becomes before start date", () => {
    withMockStorage((storage) => {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          {
            item_name: "Equipment",
            product_mode: "hire",
            quantity: 1,
            hire_prices: { 1: "£50" },
          },
        ]),
      );

      document.body.innerHTML = `
        <input type="date" name="start_date" value="2025-01-10" />
        <input type="date" name="end_date" value="2025-01-15" />
        <div id="hire-total"></div>
        <input type="hidden" id="hire_days" />
      `;

      initHireCalculator();

      const startInput = document.querySelector('input[name="start_date"]');
      const endInput = document.querySelector('input[name="end_date"]');

      // Change start date to after the current end date
      startInput.value = "2025-01-20";
      startInput.dispatchEvent(new Event("change"));

      // End date should be adjusted to match start date
      expect(endInput.value).toBe("2025-01-20");
    });
  });

  test("initHireCalculator updates total on end date change", () => {
    withMockStorage((storage) => {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          {
            item_name: "Equipment",
            product_mode: "hire",
            quantity: 1,
            hire_prices: { 1: "£50", 2: "£80" },
          },
        ]),
      );

      document.body.innerHTML = `
        <input type="date" name="start_date" value="2025-01-15" />
        <input type="date" name="end_date" value="" />
        <div id="hire-total" style="display: none;"></div>
        <input type="hidden" id="hire_days" value="" />
      `;

      initHireCalculator();

      const endInput = document.querySelector('input[name="end_date"]');
      const totalEl = document.getElementById("hire-total");
      const daysInput = document.getElementById("hire_days");

      // Set end date and trigger change
      endInput.value = "2025-01-16";
      endInput.dispatchEvent(new Event("change"));

      expect(totalEl.style.display).toBe("block");
      expect(daysInput.value).toBe("2");
      expect(totalEl.textContent).toContain("£80.00");
    });
  });
});
