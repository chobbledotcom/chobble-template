// Hire Calculator Tests
// Tests the hire-calculator.js functions for date calculation and pricing

import assert from "node:assert";
import {
  calculateDays,
  calculateHireTotal,
  getHireItems,
  hasHireItems,
  parsePrice,
} from "#assets/hire-calculator.js";
import { createTestRunner } from "#test/test-utils.js";

const testCases = [
  // ----------------------------------------
  // parsePrice Tests
  // ----------------------------------------
  {
    name: "parsePrice-returns-number-if-already-number",
    description: "parsePrice returns the number unchanged if input is numeric",
    test: () => {
      assert.strictEqual(parsePrice(50), 50, "Should return 50 unchanged");
      assert.strictEqual(
        parsePrice(19.99),
        19.99,
        "Should return 19.99 unchanged",
      );
      assert.strictEqual(parsePrice(0), 0, "Should return 0 unchanged");
    },
  },
  {
    name: "parsePrice-extracts-number-from-currency-string",
    description: "parsePrice extracts numeric value from currency strings",
    test: () => {
      assert.strictEqual(parsePrice("£50"), 50, "Should extract 50 from £50");
      assert.strictEqual(
        parsePrice("£19.99"),
        19.99,
        "Should extract 19.99 from £19.99",
      );
      assert.strictEqual(
        parsePrice("$100.50"),
        100.5,
        "Should extract 100.50 from $100.50",
      );
    },
  },
  {
    name: "parsePrice-handles-from-prefix",
    description: "parsePrice extracts number from 'from £X' strings",
    test: () => {
      assert.strictEqual(
        parsePrice("from £30"),
        30,
        "Should extract 30 from 'from £30'",
      );
      assert.strictEqual(
        parsePrice("From £45.50"),
        45.5,
        "Should extract 45.50 from 'From £45.50'",
      );
    },
  },
  {
    name: "parsePrice-handles-per-day-suffix",
    description: "parsePrice extracts number from strings with /day suffix",
    test: () => {
      assert.strictEqual(
        parsePrice("£25/day"),
        25,
        "Should extract 25 from £25/day",
      );
      assert.strictEqual(
        parsePrice("£35.00 per day"),
        35,
        "Should extract 35 from £35.00 per day",
      );
    },
  },
  {
    name: "parsePrice-returns-zero-for-empty-values",
    description: "parsePrice returns 0 for null, undefined, or empty string",
    test: () => {
      assert.strictEqual(parsePrice(null), 0, "Should return 0 for null");
      assert.strictEqual(
        parsePrice(undefined),
        0,
        "Should return 0 for undefined",
      );
      assert.strictEqual(parsePrice(""), 0, "Should return 0 for empty string");
    },
  },
  {
    name: "parsePrice-returns-zero-for-non-numeric-strings",
    description: "parsePrice returns 0 for strings with no numbers",
    test: () => {
      assert.strictEqual(parsePrice("free"), 0, "Should return 0 for 'free'");
      assert.strictEqual(parsePrice("POA"), 0, "Should return 0 for 'POA'");
    },
  },

  // ----------------------------------------
  // calculateDays Tests
  // ----------------------------------------
  {
    name: "calculateDays-single-day-hire",
    description: "calculateDays returns 1 when start and end are same day",
    test: () => {
      assert.strictEqual(
        calculateDays("2025-01-15", "2025-01-15"),
        1,
        "Same start and end date should be 1 day",
      );
    },
  },
  {
    name: "calculateDays-multi-day-hire",
    description: "calculateDays counts days inclusive of start and end",
    test: () => {
      assert.strictEqual(
        calculateDays("2025-01-15", "2025-01-17"),
        3,
        "15th to 17th should be 3 days (inclusive)",
      );
      assert.strictEqual(
        calculateDays("2025-01-01", "2025-01-05"),
        5,
        "1st to 5th should be 5 days (inclusive)",
      );
    },
  },
  {
    name: "calculateDays-cross-month-hire",
    description: "calculateDays works across month boundaries",
    test: () => {
      assert.strictEqual(
        calculateDays("2025-01-30", "2025-02-02"),
        4,
        "Jan 30 to Feb 2 should be 4 days",
      );
    },
  },
  {
    name: "calculateDays-returns-zero-for-invalid-range",
    description: "calculateDays returns 0 when end is before start",
    test: () => {
      assert.strictEqual(
        calculateDays("2025-01-20", "2025-01-15"),
        0,
        "End before start should return 0",
      );
    },
  },

  // ----------------------------------------
  // hasHireItems Tests
  // ----------------------------------------
  {
    name: "hasHireItems-returns-true-when-hire-items-exist",
    description: "hasHireItems returns true if any item has product_mode hire",
    test: () => {
      const cart = [
        { item_name: "Widget", product_mode: "buy" },
        { item_name: "Doggy Care", product_mode: "hire" },
      ];
      assert.strictEqual(
        hasHireItems(cart),
        true,
        "Should return true when cart has hire item",
      );
    },
  },
  {
    name: "hasHireItems-returns-false-when-no-hire-items",
    description: "hasHireItems returns false if no items have hire mode",
    test: () => {
      const cart = [
        { item_name: "Widget", product_mode: "buy" },
        { item_name: "Gadget", product_mode: null },
      ];
      assert.strictEqual(
        hasHireItems(cart),
        false,
        "Should return false when no hire items",
      );
    },
  },
  {
    name: "hasHireItems-returns-false-for-empty-cart",
    description: "hasHireItems returns false for empty cart",
    test: () => {
      assert.strictEqual(
        hasHireItems([]),
        false,
        "Should return false for empty cart",
      );
    },
  },

  // ----------------------------------------
  // getHireItems Tests
  // ----------------------------------------
  {
    name: "getHireItems-filters-only-hire-items",
    description: "getHireItems returns only items with product_mode hire",
    test: () => {
      const cart = [
        { item_name: "Widget", product_mode: "buy" },
        { item_name: "Doggy Care", product_mode: "hire" },
        { item_name: "Gadget", product_mode: null },
        { item_name: "Equipment", product_mode: "hire" },
      ];
      const hireItems = getHireItems(cart);
      assert.strictEqual(hireItems.length, 2, "Should return 2 hire items");
      assert.strictEqual(
        hireItems[0].item_name,
        "Doggy Care",
        "First hire item should be Doggy Care",
      );
      assert.strictEqual(
        hireItems[1].item_name,
        "Equipment",
        "Second hire item should be Equipment",
      );
    },
  },
  {
    name: "getHireItems-returns-empty-for-no-hire-items",
    description: "getHireItems returns empty array when no hire items",
    test: () => {
      const cart = [{ item_name: "Widget", product_mode: "buy" }];
      const hireItems = getHireItems(cart);
      assert.strictEqual(hireItems.length, 0, "Should return empty array");
    },
  },

  // ----------------------------------------
  // calculateHireTotal Tests
  // ----------------------------------------
  {
    name: "calculateHireTotal-calculates-single-item-total",
    description: "calculateHireTotal multiplies price by quantity for a day",
    test: () => {
      const cart = [
        {
          item_name: "Doggy Care",
          product_mode: "hire",
          quantity: 2,
          hire_prices: { 1: "£30", 2: "£45", 3: "£55" },
        },
      ];
      const result = calculateHireTotal(cart, 2);
      assert.strictEqual(
        result.canCalculate,
        true,
        "Should be able to calculate",
      );
      assert.strictEqual(result.total, 90, "2 days at £45 * 2 qty = £90");
    },
  },
  {
    name: "calculateHireTotal-sums-multiple-hire-items",
    description: "calculateHireTotal sums totals across multiple hire items",
    test: () => {
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
      assert.strictEqual(
        result.canCalculate,
        true,
        "Should be able to calculate",
      );
      assert.strictEqual(result.total, 125, "£45 + £80 = £125");
    },
  },
  {
    name: "calculateHireTotal-returns-cannot-calculate-for-missing-price",
    description:
      "calculateHireTotal returns canCalculate false when price unavailable",
    test: () => {
      const cart = [
        {
          item_name: "Doggy Care",
          product_mode: "hire",
          quantity: 1,
          hire_prices: { 1: "£30", 2: "£45" },
        },
      ];
      const result = calculateHireTotal(cart, 5);
      assert.strictEqual(
        result.canCalculate,
        false,
        "Should not be able to calculate for 5 days",
      );
      assert.strictEqual(
        result.total,
        0,
        "Total should be 0 when cannot calculate",
      );
    },
  },
  {
    name: "calculateHireTotal-returns-cannot-calculate-for-zero-days",
    description: "calculateHireTotal returns canCalculate false for 0 days",
    test: () => {
      const cart = [
        {
          item_name: "Doggy Care",
          product_mode: "hire",
          quantity: 1,
          hire_prices: { 1: "£30" },
        },
      ];
      const result = calculateHireTotal(cart, 0);
      assert.strictEqual(
        result.canCalculate,
        false,
        "Should not be able to calculate for 0 days",
      );
    },
  },
  {
    name: "calculateHireTotal-returns-cannot-calculate-for-empty-cart",
    description: "calculateHireTotal returns canCalculate false for empty cart",
    test: () => {
      const result = calculateHireTotal([], 3);
      assert.strictEqual(
        result.canCalculate,
        false,
        "Should not be able to calculate for empty cart",
      );
    },
  },
  {
    name: "calculateHireTotal-ignores-buy-items",
    description: "calculateHireTotal only includes hire items in total",
    test: () => {
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
      assert.strictEqual(
        result.canCalculate,
        true,
        "Should be able to calculate",
      );
      assert.strictEqual(
        result.total,
        100,
        "Should only include hire item total",
      );
    },
  },
  {
    name: "calculateHireTotal-handles-numeric-prices",
    description: "calculateHireTotal handles numeric prices in hire_prices",
    test: () => {
      const cart = [
        {
          item_name: "Equipment",
          product_mode: "hire",
          quantity: 3,
          hire_prices: { 1: 40, 2: 70 },
        },
      ];
      const result = calculateHireTotal(cart, 1);
      assert.strictEqual(
        result.canCalculate,
        true,
        "Should be able to calculate",
      );
      assert.strictEqual(result.total, 120, "1 day at £40 * 3 qty = £120");
    },
  },
];

export default createTestRunner("hire-calculator", testCases);
