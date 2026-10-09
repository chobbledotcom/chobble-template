import { describe, expect, test } from "vitest";
import { formatPrice } from "#utils/format-price.js";

describe("formatPrice", () => {
  test.each([
    { amount: 20, currency: "GBP", shown: "£20" },
    { amount: 12.5, currency: "GBP", shown: "£12.50" },
    { amount: 1250, currency: "EUR", shown: "€1,250" },
    { amount: 0.99, currency: "USD", shown: "US$0.99" },
  ])("shows $amount $currency as $shown", ({ amount, currency, shown }) => {
    expect(formatPrice(amount, currency)).toBe(shown);
  });
});
