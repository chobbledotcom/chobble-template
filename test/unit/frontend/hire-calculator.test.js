// Hire Calculator Tests
// Tests the hire-calculator.js functions for date management

import { describe, expect, test } from "bun:test";
import {
  calculateDays,
  getHireItems,
  hasHireItems,
  initHireCalculator,
  isHireItem,
  setMinDate,
} from "#public/cart/hire-calculator.js";
import { STORAGE_KEY } from "#public/utils/cart-utils.js";

// Helper to run tests with isolated localStorage
const withMockStorage = (fn) => {
  globalThis.localStorage.clear();
  try {
    return fn(globalThis.localStorage);
  } finally {
    globalThis.localStorage.clear();
  }
};

/** Get today's date in YYYY-MM-DD format */
const getToday = () => new Date().toISOString().split("T")[0];

/** Create hire calculator DOM with optional date values */
const createHireDatesHtml = ({ start = "", end = "", days = "" } = {}) => `
  <input type="date" name="start_date" value="${start}" />
  <input type="date" name="end_date" value="${end}" />
  <input type="hidden" id="hire_days" value="${days}" />
`;

/** Set up test with hire item in cart and hire date inputs */
const withHireTestSetup = (dates, fn) =>
  withMockStorage((storage) => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ item_name: "Equipment", product_mode: "hire" }]),
    );
    document.body.innerHTML = createHireDatesHtml(dates);
    return fn({ storage });
  });

/** Initialize hire calculator with callback tracking, return elements and callback getter */
const initHireWithCallback = () => {
  let callbackDays = null;
  initHireCalculator((days) => {
    callbackDays = days;
  });
  return {
    endInput: document.querySelector('input[name="end_date"]'),
    daysInput: document.getElementById("hire_days"),
    getCallbackDays: () => callbackDays,
  };
};

describe("hire-calculator", () => {
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
  // setMinDate Tests
  // ----------------------------------------
  test("setMinDate sets min attribute to today's date", () => {
    document.body.innerHTML = '<input type="date" id="test-date" />';
    const input = document.getElementById("test-date");

    setMinDate(input);

    expect(input.min).toBe(getToday());
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

    expect(startInput.min).toBe(getToday());
    expect(endInput.min).toBe(getToday());
  });

  // ----------------------------------------
  // initHireCalculator Tests
  // ----------------------------------------
  test("initHireCalculator does nothing when start input missing", () => {
    withMockStorage(() => {
      document.body.innerHTML = '<input type="date" name="end_date" />';
      expect(() => initHireCalculator()).not.toThrow();
    });
  });

  test("initHireCalculator does nothing when end input missing", () => {
    withMockStorage(() => {
      document.body.innerHTML = '<input type="date" name="start_date" />';
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
        <input type="hidden" id="hire_days" />
      `;

      initHireCalculator();

      const startInput = document.querySelector('input[name="start_date"]');
      expect(startInput.min).toBe("");
    });
  });

  test("initHireCalculator sets min dates when cart has hire items", () => {
    withHireTestSetup({}, () => {
      initHireCalculator();

      const startInput = document.querySelector('input[name="start_date"]');
      const endInput = document.querySelector('input[name="end_date"]');
      expect(startInput.min).toBe(getToday());
      expect(endInput.min).toBe(getToday());
    });
  });

  test("initHireCalculator updates end min when start date changes", () => {
    withHireTestSetup({}, () => {
      initHireCalculator(() => {});

      const startInput = document.querySelector('input[name="start_date"]');
      const endInput = document.querySelector('input[name="end_date"]');

      startInput.value = "2025-02-15";
      startInput.dispatchEvent(new Event("change"));

      expect(endInput.min).toBe("2025-02-15");
    });
  });

  test("initHireCalculator adjusts end date when it becomes before start date", () => {
    withHireTestSetup({ start: "2025-01-10", end: "2025-01-15" }, () => {
      initHireCalculator(() => {});

      const startInput = document.querySelector('input[name="start_date"]');
      const endInput = document.querySelector('input[name="end_date"]');

      startInput.value = "2025-01-20";
      startInput.dispatchEvent(new Event("change"));

      expect(endInput.value).toBe("2025-01-20");
    });
  });

  test("initHireCalculator calls onDaysChange callback when dates change", () => {
    withHireTestSetup({ start: "2025-01-15" }, () => {
      const { endInput, daysInput, getCallbackDays } = initHireWithCallback();

      endInput.value = "2025-01-17";
      endInput.dispatchEvent(new Event("change"));

      expect(daysInput.value).toBe("3");
      expect(getCallbackDays()).toBe(3);
    });
  });

  test("initHireCalculator calls callback with 1 when dates incomplete", () => {
    withHireTestSetup({ start: "2025-01-15", end: "2025-01-17", days: "3" }, () => {
      const { endInput, daysInput, getCallbackDays } = initHireWithCallback();

      // Clear end date
      endInput.value = "";
      endInput.dispatchEvent(new Event("change"));

      expect(daysInput.value).toBe("");
      expect(getCallbackDays()).toBe(1);
    });
  });
});
