import { describe, test, expect } from "bun:test";
import {
  extractRootVariables,
  generateThemeSwitcherContent,
  getThemeFiles,
  slugToTitle,
} from "#build/theme-compiler.js";

describe("theme-compiler", () => {
  // ============================================
  // extractRootVariables tests
  // ============================================
  describe("extractRootVariables", () => {
    test("Extracts variables from a simple :root block", () => {
      const content = `:root {
  --color-bg: #000;
  --color-text: #fff;
}`;
      const result = extractRootVariables(content);

      expect(result.includes("--color-bg: #000")).toBe(true);
      expect(result.includes("--color-text: #fff")).toBe(true);
    });

    test("Returns empty string when no :root block exists", () => {
      const content = `body { color: red; }`;
      const result = extractRootVariables(content);

      expect(result).toBe("");
    });

    test("Only extracts content from :root block, ignoring rest", () => {
      // This matches how real theme files are structured (e.g., theme-ocean.scss)
      const content = `// Ocean Theme - Deep blue with aqua accents
:root {
  --color-bg: #001f3f;
  --color-text: #7fdbff;
}

body {
  background: #002a55;
}`;
      const result = extractRootVariables(content);

      expect(result.includes("--color-bg: #001f3f")).toBe(true);
      expect(result.includes("--color-text: #7fdbff")).toBe(true);
      expect(!result.includes("background")).toBe(true);
      expect(!result.includes("Ocean Theme")).toBe(true);
    });

    test("Handles CSS variables with complex values like in real themes", () => {
      // Values taken from actual theme files
      const content = `:root {
  --font-family-heading: "Share Tech Mono", "Lucida Console", monospace;
  --box-shadow: 0 0 10px #00ff00;
  --border: 2px solid #00ff00;
}`;
      const result = extractRootVariables(content);

      expect(result.includes("--font-family-heading:")).toBe(true);
      expect(result.includes("--box-shadow: 0 0 10px #00ff00")).toBe(true);
      expect(result.includes("--border: 2px solid #00ff00")).toBe(true);
    });
  });

  // ============================================
  // slugToTitle tests
  // ============================================
  describe("slugToTitle", () => {
    test("Converts hyphenated name to title case (90s-computer)", () => {
      // Real theme name from the codebase
      const result = slugToTitle("90s-computer");
      expect(result).toBe("90s Computer");
    });

    test("Capitalizes single word theme name (ocean)", () => {
      // Real theme name from the codebase
      const result = slugToTitle("ocean");
      expect(result).toBe("Ocean");
    });

    test("Handles multiple hyphenated words (old-mac)", () => {
      // Real theme name from the codebase
      const result = slugToTitle("old-mac");
      expect(result).toBe("Old Mac");
    });
  });

  // ============================================
  // getThemeFiles tests
  // ============================================
  describe("getThemeFiles", () => {
    test("Returns array of theme objects from src/css", () => {
      const themes = getThemeFiles();

      expect(Array.isArray(themes)).toBe(true);
      expect(themes.length >= 8).toBe(true);
    });

    test("Each theme has name, file, and content properties", () => {
      const themes = getThemeFiles();
      const theme = themes.find((t) => t.name === "ocean");

      expect(theme !== undefined).toBe(true);
      expect(theme.file).toBe("theme-ocean.scss");
      expect(theme.content.includes(":root")).toBe(true);
      expect(theme.content.includes("--color-bg")).toBe(true);
    });

    test("Excludes theme-switcher.scss and theme-switcher-compiled.scss", () => {
      const themes = getThemeFiles();
      const names = themes.map((t) => t.name);

      expect(!names.includes("switcher")).toBe(true);
      expect(!names.includes("switcher-compiled")).toBe(true);
    });

    test("Themes are sorted alphabetically by name", () => {
      const themes = getThemeFiles();
      const names = themes.map((t) => t.name);

      for (let i = 1; i < names.length; i++) {
        expect(names[i - 1].localeCompare(names[i]) <= 0).toBe(true);
      }
    });
  });

  // ============================================
  // generateThemeSwitcherContent tests
  // ============================================
  describe("generateThemeSwitcherContent", () => {
    test("Output includes warning header about auto-generation", () => {
      const result = generateThemeSwitcherContent();

      expect(result.includes("Auto-generated theme definitions")).toBe(true);
      expect(result.includes("DO NOT EDIT")).toBe(true);
    });

    test("Generates html[data-theme] selector for each theme", () => {
      const result = generateThemeSwitcherContent();
      const themes = getThemeFiles();

      // Verify each theme has a corresponding selector
      for (const theme of themes) {
        expect(result.includes(`html[data-theme="${theme.name}"]`)).toBe(true);
      }
    });

    test("Theme selectors contain the extracted CSS variables", () => {
      const result = generateThemeSwitcherContent();

      // Ocean theme has --color-bg: #001f3f - verify it's in the ocean selector
      const oceanSelectorStart = result.indexOf('html[data-theme="ocean"]');
      const oceanSelectorEnd = result.indexOf("}", oceanSelectorStart);
      const oceanBlock = result.slice(oceanSelectorStart, oceanSelectorEnd);

      expect(oceanBlock.includes("--color-bg")).toBe(true);
    });

    test("Generates --theme-list with default and all theme names", () => {
      const result = generateThemeSwitcherContent();
      const themes = getThemeFiles();

      expect(result.includes("--theme-list:")).toBe(true);
      expect(result.includes('"default,')).toBe(true);

      // Check all themes are in the list
      for (const theme of themes) {
        expect(result.includes(theme.name)).toBe(true);
      }
    });

    test("Generates --theme-X-name display name for each theme", () => {
      const result = generateThemeSwitcherContent();

      expect(result.includes('--theme-default-name: "Default"')).toBe(true);
      expect(result.includes('--theme-ocean-name: "Ocean"')).toBe(true);
      expect(
        result.includes('--theme-90s-computer-name: "90s Computer"'),
      ).toBe(true);
    });

    test("Has metadata section with :root for JavaScript access", () => {
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
