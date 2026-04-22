import { describe, expect, test } from "bun:test";
import {
  buildCartText,
  getDisplayPrice,
} from "#public/cart/quote-checkout.js";

describe("quote-checkout", () => {
  const setupCurrency = () => {
    document.body.innerHTML =
      '<script id="site-config" type="application/json">{"currency":"GBP"}</script>';
  };

  test("uses day-specific hire prices in checkout summary", () => {
    setupCurrency();
    const item = {
      item_name: "Bouncy Castle - 1 day",
      product_mode: "hire",
      hire_prices: { 1: "£50", 3: "£120" },
      quantity: 2,
    };

    expect(getDisplayPrice(item, 3)).toBe("£240");
    expect(buildCartText(item, 3)).toBe(
      "Bouncy Castle x2 @ £120 = £240",
    );
  });

  test("shows TBC when hire price is missing for selected day count", () => {
    setupCurrency();
    const item = {
      item_name: "Speaker - 1 day",
      product_mode: "hire",
      hire_prices: { 1: "£25" },
      quantity: 1,
    };

    expect(getDisplayPrice(item, 5)).toBe("TBC");
    expect(buildCartText(item, 5)).toBe("Speaker x1 @ TBC = TBC");
  });
});
