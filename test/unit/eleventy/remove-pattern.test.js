import { describe, expect, test } from "bun:test";
import {
  configureRemovePattern,
  removePattern,
} from "#eleventy/remove-pattern.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("remove-pattern", () => {
  test("registers removePattern filter with Eleventy", () => {
    const mockConfig = createMockEleventyConfig();
    configureRemovePattern(mockConfig);

    expect(typeof mockConfig.filters.removePattern).toBe("function");
  });

  test("returns input unchanged when pattern is empty", () => {
    expect(removePattern("Service in Town A", "")).toBe("Service in Town A");
  });

  test("returns input unchanged when pattern is undefined", () => {
    expect(removePattern("hello", undefined)).toBe("hello");
  });

  test("strips a literal prefix from every match", () => {
    expect(removePattern("Service in Town A", "Service in ")).toBe("Town A");
  });

  test("removes every match (global)", () => {
    expect(removePattern("aa-bb-aa-cc-aa", "aa")).toBe("-bb--cc-");
  });

  test("supports regex metacharacters", () => {
    expect(removePattern("foo123bar456baz", "\\d+")).toBe("foobarbaz");
  });

  test("trims whitespace left over after removal", () => {
    expect(removePattern("  Service in Town A  ", "Service in ")).toBe(
      "Town A",
    );
  });

  test("throws on invalid regex so authors see the error immediately", () => {
    expect(() => removePattern("anything", "(")).toThrow();
  });
});
