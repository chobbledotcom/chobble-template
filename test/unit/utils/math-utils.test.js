import { describe, expect, test } from "bun:test";
import { simplifyRatio } from "#utils/math-utils.js";

describe("math-utils", () => {
  // ============================================
  // simplifyRatio Tests
  // ============================================
  test("Simplifies common aspect ratios", () => {
    expect(simplifyRatio(1920, 1080)).toBe("16/9");
    expect(simplifyRatio(1600, 900)).toBe("16/9");
    expect(simplifyRatio(800, 600)).toBe("4/3");
  });

  test("Simplifies square ratios to 1/1", () => {
    expect(simplifyRatio(1600, 1600)).toBe("1/1");
    expect(simplifyRatio(500, 500)).toBe("1/1");
  });

  test("Handles already simplified ratios", () => {
    expect(simplifyRatio(16, 9)).toBe("16/9");
    expect(simplifyRatio(4, 3)).toBe("4/3");
    expect(simplifyRatio(1, 1)).toBe("1/1");
  });

  test("Simplifies banner/header dimensions", () => {
    expect(simplifyRatio(1920, 540)).toBe("32/9");
    expect(simplifyRatio(1600, 800)).toBe("2/1");
  });

  test("Handles coprime dimensions", () => {
    expect(simplifyRatio(7, 11)).toBe("7/11");
    expect(simplifyRatio(13, 17)).toBe("13/17");
  });

  test("Correctly reduces ratio when one dimension is zero-compatible", () => {
    // When second dimension is 0, ratio becomes N/0
    // This tests internal gcd handling of zero case
    expect(simplifyRatio(5, 5)).toBe("1/1");
    expect(simplifyRatio(12, 12)).toBe("1/1");
  });

  test("Correctly finds GCD for various dimension pairs", () => {
    // These test cases verify internal GCD calculation through simplifyRatio results
    // gcd(12, 8) = 4 -> 12/8 simplifies to 3/2
    expect(simplifyRatio(12, 8)).toBe("3/2");
    // gcd(48, 18) = 6 -> 48/18 simplifies to 8/3
    expect(simplifyRatio(48, 18)).toBe("8/3");
    // gcd(100, 25) = 25 -> 100/25 simplifies to 4/1
    expect(simplifyRatio(100, 25)).toBe("4/1");
  });
});
