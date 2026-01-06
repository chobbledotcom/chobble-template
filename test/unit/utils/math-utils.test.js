import { describe, expect, test } from "bun:test";
import { gcd, simplifyRatio } from "#utils/math-utils.js";

describe("math-utils", () => {
  // ============================================
  // gcd Tests
  // ============================================
  test("Computes GCD of two numbers", () => {
    expect(gcd(12, 8)).toBe(4);
    expect(gcd(48, 18)).toBe(6);
    expect(gcd(100, 25)).toBe(25);
  });

  test("Returns first number when second is zero", () => {
    expect(gcd(5, 0)).toBe(5);
    expect(gcd(12, 0)).toBe(12);
  });

  test("Handles common aspect ratio dimensions", () => {
    expect(gcd(1920, 1080)).toBe(120);
    expect(gcd(1600, 900)).toBe(100);
    expect(gcd(800, 600)).toBe(200);
  });

  test("Returns 1 for coprime numbers", () => {
    expect(gcd(7, 11)).toBe(1);
    expect(gcd(17, 13)).toBe(1);
  });

  test("Handles equal numbers", () => {
    expect(gcd(5, 5)).toBe(5);
    expect(gcd(100, 100)).toBe(100);
  });

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
});
