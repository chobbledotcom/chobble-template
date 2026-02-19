// Hire Calculator Tests
// Tests the hire-calculator.js public API via DOM simulation

import { describe, expect, test } from "bun:test";
import {
  calculateDays,
  initHireCalculator,
} from "#public/cart/hire-calculator.js";
import { CART_STORAGE_KEY } from "#test/test-utils.js";

// Helper to run tests with isolated localStorage
const withHireMockStorage = (fn) => {
  globalThis.localStorage.clear();
  try {
    return fn(globalThis.localStorage);
  } finally {
    globalThis.localStorage.clear();
  }
};

/** Get today's date in YYYY-MM-DD format */
const getTodayIso = () => new Date().toISOString().split("T")[0];

/** Set up test with hire item in cart and hire date inputs */
const withHireTestSetup = ({ start = "", end = "", days = "" } = {}, fn) =>
  withHireMockStorage((storage) => {
    storage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ item_name: "Equipment", product_mode: "hire" }]),
    );
    document.body.innerHTML = `
      <input type="date" name="start_date" value="${start}" />
      <input type="date" name="end_date" value="${end}" />
      <input type="hidden" id="hire_days" value="${days}" />
    `;
    return fn({ storage });
  });

/** Get start and end date inputs */
const getDateInputs = () => ({
  startInput: document.querySelector('input[name="start_date"]'),
  endInput: document.querySelector('input[name="end_date"]'),
});

/** Initialize hire calculator with callback tracking, return elements and callback getter */
const initHireWithCallback = () => {
  let callbackDays = null;
  initHireCalculator((days) => {
    callbackDays = days;
  });
  const { endInput } = getDateInputs();
  return {
    endInput,
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
  // initHireCalculator Tests
  // ----------------------------------------
  test("initHireCalculator does nothing when start input missing", () => {
    withHireMockStorage((storage) => {
      storage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify([{ item_name: "Equipment", product_mode: "hire" }]),
      );
      document.body.innerHTML = '<input type="date" name="end_date" />';

      initHireCalculator(() => {
        // no-op: stub recalculation callback
      });

      const endInput = document.querySelector('input[name="end_date"]');
      expect(endInput.min).toBe("");
    });
  });

  test("initHireCalculator does nothing when cart has no hire items", () => {
    withHireMockStorage((storage) => {
      storage.setItem(
        CART_STORAGE_KEY,
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

      const { startInput, endInput } = getDateInputs();
      expect(startInput.min).toBe(getTodayIso());
      expect(endInput.min).toBe(getTodayIso());
    });
  });

  test("initHireCalculator updates end min when start date changes", () => {
    withHireTestSetup({}, () => {
      initHireCalculator(() => {
        // no-op: stub recalculation callback
      });

      const { startInput, endInput } = getDateInputs();

      startInput.value = "2025-02-15";
      startInput.dispatchEvent(new Event("change"));

      expect(endInput.min).toBe("2025-02-15");
    });
  });

  test("initHireCalculator adjusts end date when it becomes before start date", () => {
    withHireTestSetup({ start: "2025-01-10", end: "2025-01-15" }, () => {
      initHireCalculator(() => {
        // no-op: stub recalculation callback
      });

      const { startInput, endInput } = getDateInputs();

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
    withHireTestSetup(
      { start: "2025-01-15", end: "2025-01-17", days: "3" },
      () => {
        const { endInput, daysInput, getCallbackDays } = initHireWithCallback();

        // Clear end date
        endInput.value = "";
        endInput.dispatchEvent(new Event("change"));

        expect(daysInput.value).toBe("");
        expect(getCallbackDays()).toBe(1);
      },
    );
  });
});
