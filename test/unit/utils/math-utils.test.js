import { describe, expect, test } from "bun:test";
import { simplifyRatio } from "#utils/math-utils.js";

describe("math-utils", () => {
  // ============================================
  // simplifyRatio Tests
  // ============================================
  test("Simplifies common aspect ratios", () => {
    expect(simplifyRatio({ width: 1920, height: 1080 })).toBe("16/9");
    expect(simplifyRatio({ width: 1600, height: 900 })).toBe("16/9");
    expect(simplifyRatio({ width: 800, height: 600 })).toBe("4/3");
  });

  test("Simplifies square ratios to 1/1", () => {
    expect(simplifyRatio({ width: 1600, height: 1600 })).toBe("1/1");
    expect(simplifyRatio({ width: 500, height: 500 })).toBe("1/1");
  });

  test("Handles already simplified ratios", () => {
    expect(simplifyRatio({ width: 16, height: 9 })).toBe("16/9");
    expect(simplifyRatio({ width: 4, height: 3 })).toBe("4/3");
    expect(simplifyRatio({ width: 1, height: 1 })).toBe("1/1");
  });

  test("Simplifies banner/header dimensions", () => {
    expect(simplifyRatio({ width: 1920, height: 540 })).toBe("32/9");
    expect(simplifyRatio({ width: 1600, height: 800 })).toBe("2/1");
  });

  test("Handles coprime dimensions", () => {
    expect(simplifyRatio({ width: 7, height: 11 })).toBe("7/11");
    expect(simplifyRatio({ width: 13, height: 17 })).toBe("13/17");
  });

  test("Correctly reduces ratio when one dimension is zero-compatible", () => {
    // When second dimension is 0, ratio becomes N/0
    // This tests internal gcd handling of zero case
    expect(simplifyRatio({ width: 5, height: 5 })).toBe("1/1");
    expect(simplifyRatio({ width: 12, height: 12 })).toBe("1/1");
  });

  test("Correctly finds GCD for various dimension pairs", () => {
    // These test cases verify internal GCD calculation through simplifyRatio results
    // gcd(12, 8) = 4 -> 12/8 simplifies to 3/2
    expect(simplifyRatio({ width: 12, height: 8 })).toBe("3/2");
    // gcd(48, 18) = 6 -> 48/18 simplifies to 8/3
    expect(simplifyRatio({ width: 48, height: 18 })).toBe("8/3");
    // gcd(100, 25) = 25 -> 100/25 simplifies to 4/1
    expect(simplifyRatio({ width: 100, height: 25 })).toBe("4/1");
  });
});
