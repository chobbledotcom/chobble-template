import { describe, expect, test } from "bun:test";
import { generateThemeSwitcherContent } from "#build/theme-compiler.js";

describe("theme-compiler", () => {
  describe("generateThemeSwitcherContent", () => {
    test("output includes warning header about auto-generation", () => {
      const result = generateThemeSwitcherContent();

      expect(result.includes("Auto-generated theme definitions")).toBe(true);
      expect(result.includes("DO NOT EDIT")).toBe(true);
    });

    test("generates html[data-theme] selectors for themes", () => {
      const result = generateThemeSwitcherContent();

      // Should have at least the ocean theme (known to exist)
      expect(result.includes('html[data-theme="ocean"]')).toBe(true);
    });

    test("theme selectors contain CSS variables", () => {
      const result = generateThemeSwitcherContent();

      // Ocean theme has --color-bg - verify it's in the ocean selector
      const oceanSelectorStart = result.indexOf('html[data-theme="ocean"]');
      const oceanSelectorEnd = result.indexOf("}", oceanSelectorStart);
      const oceanBlock = result.slice(oceanSelectorStart, oceanSelectorEnd);

      expect(oceanBlock.includes("--color-bg")).toBe(true);
    });

    test("generates --theme-list with default and theme names", () => {
      const result = generateThemeSwitcherContent();

      expect(result.includes("--theme-list:")).toBe(true);
      expect(result.includes('"default,')).toBe(true);
      expect(result.includes("ocean")).toBe(true);
    });

    test("generates display names for themes", () => {
      const result = generateThemeSwitcherContent();

      expect(result.includes('--theme-default-name: "Default"')).toBe(true);
      expect(result.includes('--theme-ocean-name: "Ocean"')).toBe(true);
      expect(result.includes('--theme-90s-computer-name: "90s Computer"')).toBe(
        true,
      );
    });

    test("excludes theme-editor from compiled themes", () => {
      const result = generateThemeSwitcherContent();

      expect(result.includes('data-theme="editor"')).toBe(false);
      expect(result.includes("--theme-editor-name")).toBe(false);
    });

    test("has metadata section with :root for JavaScript access", () => {
      const result = generateThemeSwitcherContent();

      expect(result.includes("Theme metadata for JavaScript access")).toBe(
        true,
      );

      // The metadata :root block should contain --theme-list
      const metadataStart = result.indexOf("Theme metadata");
      const afterMetadata = result.slice(metadataStart);
      expect(afterMetadata.includes(":root {")).toBe(true);
    });
  });
});
