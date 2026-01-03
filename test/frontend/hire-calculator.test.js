// Hire Calculator Tests
// Tests the hire-calculator.js functions for date calculation and pricing

import { describe, expect, test } from "bun:test";
import {
  calculateDays,
  calculateHireTotal,
  getHireItems,
  hasHireItems,
  parsePrice,
} from "#assets/hire-calculator.js";

describe("hire-calculator", () => {
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
});
