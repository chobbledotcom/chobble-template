import {
  extractRootVariables,
  generateThemeSwitcherContent,
  getThemeFiles,
  toDisplayName,
} from "#build/theme-compiler.js";
import {
  createTestRunner,
  expectStrictEqual,
  expectTrue,
} from "#test/test-utils.js";

const testCases = [
  // ============================================
  // extractRootVariables tests
  // ============================================
  {
    name: "extractRootVariables-basic",
    description: "Extracts variables from a simple :root block",
    test: () => {
      const content = `:root {
  --color-bg: #000;
  --color-text: #fff;
}`;
      const result = extractRootVariables(content);

      expectTrue(
        result.includes("--color-bg: #000"),
        "Should include bg variable",
      );
      expectTrue(
        result.includes("--color-text: #fff"),
        "Should include text variable",
      );
    },
  },
  {
    name: "extractRootVariables-no-root",
    description: "Returns empty string when no :root block exists",
    test: () => {
      const content = `body { color: red; }`;
      const result = extractRootVariables(content);

      expectStrictEqual(result, "", "Should return empty string");
    },
  },
  {
    name: "extractRootVariables-with-extra-content",
    description: "Only extracts content from :root block, ignoring rest",
    test: () => {
      const content = `// Comment
:root {
  --border: 2px solid #ccc;
}

body {
  background: blue;
}`;
      const result = extractRootVariables(content);

      expectTrue(
        result.includes("--border: 2px solid #ccc"),
        "Should include border variable",
      );
      expectTrue(
        !result.includes("background"),
        "Should not include body styles",
      );
      expectTrue(!result.includes("Comment"), "Should not include comments");
    },
  },
  {
    name: "extractRootVariables-complex-values",
    description: "Handles CSS variables with complex values",
    test: () => {
      const content = `:root {
  --font-family: "Courier New", monospace;
  --box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}`;
      const result = extractRootVariables(content);

      expectTrue(
        result.includes('--font-family: "Courier New", monospace'),
        "Should handle quoted values",
      );
      expectTrue(
        result.includes("--box-shadow: 0 0 10px rgba(0, 0, 0, 0.5)"),
        "Should handle function values",
      );
    },
  },
  {
    name: "extractRootVariables-whitespace-variations",
    description: "Handles different whitespace patterns in :root",
    test: () => {
      const content = `:root{--color:#000;--bg:#fff;}`;
      const result = extractRootVariables(content);

      expectTrue(
        result.includes("--color:#000"),
        "Should handle no whitespace",
      );
      expectTrue(result.includes("--bg:#fff"), "Should include all variables");
    },
  },

  // ============================================
  // toDisplayName tests
  // ============================================
  {
    name: "toDisplayName-hyphenated",
    description: "Converts hyphenated name to title case with spaces",
    test: () => {
      const result = toDisplayName("90s-computer");
      expectStrictEqual(result, "90s Computer", "Should convert to title case");
    },
  },
  {
    name: "toDisplayName-single-word",
    description: "Capitalizes single word theme name",
    test: () => {
      const result = toDisplayName("ocean");
      expectStrictEqual(result, "Ocean", "Should capitalize single word");
    },
  },
  {
    name: "toDisplayName-multiple-hyphens",
    description: "Handles multiple hyphenated words",
    test: () => {
      const result = toDisplayName("old-mac-style");
      expectStrictEqual(
        result,
        "Old Mac Style",
        "Should handle multiple hyphens",
      );
    },
  },
  {
    name: "toDisplayName-already-capitalized",
    description: "Preserves already capitalized letters",
    test: () => {
      const result = toDisplayName("macOS-theme");
      expectStrictEqual(
        result,
        "MacOS Theme",
        "Should capitalize first letter of each word",
      );
    },
  },
  {
    name: "toDisplayName-empty-string",
    description: "Handles empty string input",
    test: () => {
      const result = toDisplayName("");
      expectStrictEqual(result, "", "Should return empty string");
    },
  },

  // ============================================
  // getThemeFiles tests
  // ============================================
  {
    name: "getThemeFiles-returns-array",
    description: "Returns an array of theme file objects",
    test: () => {
      const themes = getThemeFiles();

      expectTrue(Array.isArray(themes), "Should return an array");
      expectTrue(themes.length > 0, "Should find at least one theme");
    },
  },
  {
    name: "getThemeFiles-structure",
    description: "Each theme object has name, file, and content properties",
    test: () => {
      const themes = getThemeFiles();
      const firstTheme = themes[0];

      expectTrue(
        typeof firstTheme.name === "string",
        "Should have name property",
      );
      expectTrue(
        typeof firstTheme.file === "string",
        "Should have file property",
      );
      expectTrue(
        typeof firstTheme.content === "string",
        "Should have content property",
      );
    },
  },
  {
    name: "getThemeFiles-excludes-switcher",
    description: "Excludes theme-switcher.scss files",
    test: () => {
      const themes = getThemeFiles();

      const hasSwitcher = themes.some(
        (t) =>
          t.file === "theme-switcher.scss" ||
          t.file === "theme-switcher-compiled.scss",
      );
      expectTrue(!hasSwitcher, "Should not include theme-switcher files");
    },
  },
  {
    name: "getThemeFiles-name-extraction",
    description: "Extracts theme name from filename correctly",
    test: () => {
      const themes = getThemeFiles();

      // Find a known theme
      const oceanTheme = themes.find((t) => t.name === "ocean");
      expectTrue(oceanTheme !== undefined, "Should find ocean theme");
      expectStrictEqual(
        oceanTheme.file,
        "theme-ocean.scss",
        "File should match naming pattern",
      );
    },
  },
  {
    name: "getThemeFiles-sorted",
    description: "Returns themes sorted alphabetically by name",
    test: () => {
      const themes = getThemeFiles();
      const names = themes.map((t) => t.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));

      expectTrue(
        JSON.stringify(names) === JSON.stringify(sortedNames),
        "Themes should be sorted alphabetically",
      );
    },
  },
  {
    name: "getThemeFiles-content-has-root",
    description: "Theme content includes :root CSS variables",
    test: () => {
      const themes = getThemeFiles();
      const oceanTheme = themes.find((t) => t.name === "ocean");

      expectTrue(
        oceanTheme.content.includes(":root"),
        "Theme should have :root block",
      );
      expectTrue(
        oceanTheme.content.includes("--color-"),
        "Theme should have color variables",
      );
    },
  },
  {
    name: "getThemeFiles-memoized",
    description: "Returns same array instance on repeated calls (memoization)",
    test: () => {
      const themes1 = getThemeFiles();
      const themes2 = getThemeFiles();

      expectTrue(themes1 === themes2, "Should return memoized result");
    },
  },

  // ============================================
  // generateThemeSwitcherContent tests
  // ============================================
  {
    name: "generateThemeSwitcherContent-header",
    description: "Generated content includes auto-generation header",
    test: () => {
      const result = generateThemeSwitcherContent();

      expectTrue(
        result.includes("Auto-generated"),
        "Should have auto-generated header",
      );
      expectTrue(
        result.includes("DO NOT EDIT"),
        "Should warn against manual editing",
      );
    },
  },
  {
    name: "generateThemeSwitcherContent-theme-rules",
    description: "Generates html[data-theme] selectors for each theme",
    test: () => {
      const result = generateThemeSwitcherContent();

      expectTrue(
        result.includes('html[data-theme="ocean"]'),
        "Should have ocean theme selector",
      );
      expectTrue(
        result.includes('html[data-theme="hacker"]'),
        "Should have hacker theme selector",
      );
    },
  },
  {
    name: "generateThemeSwitcherContent-theme-list",
    description: "Includes --theme-list CSS variable with all theme names",
    test: () => {
      const result = generateThemeSwitcherContent();

      expectTrue(
        result.includes("--theme-list:"),
        "Should have theme-list variable",
      );
      expectTrue(
        result.includes("default"),
        "Theme list should include default",
      );
      expectTrue(result.includes("ocean"), "Theme list should include ocean");
    },
  },
  {
    name: "generateThemeSwitcherContent-display-names",
    description: "Generates display name CSS variables for each theme",
    test: () => {
      const result = generateThemeSwitcherContent();

      expectTrue(
        result.includes('--theme-default-name: "Default"'),
        "Should have default display name",
      );
      expectTrue(
        result.includes('--theme-ocean-name: "Ocean"'),
        "Should have ocean display name",
      );
    },
  },
  {
    name: "generateThemeSwitcherContent-extracts-variables",
    description: "Theme rules contain extracted CSS variables",
    test: () => {
      const result = generateThemeSwitcherContent();

      // The ocean theme has --color-bg: #001f3f
      expectTrue(
        result.includes("--color-bg:") || result.includes("--color-bg: "),
        "Theme rules should contain color-bg variable",
      );
    },
  },
  {
    name: "generateThemeSwitcherContent-memoized",
    description: "Returns same result on repeated calls (memoization)",
    test: () => {
      const result1 = generateThemeSwitcherContent();
      const result2 = generateThemeSwitcherContent();

      expectTrue(result1 === result2, "Should return memoized result");
    },
  },
  {
    name: "generateThemeSwitcherContent-metadata-block",
    description: "Includes metadata block with :root selector",
    test: () => {
      const result = generateThemeSwitcherContent();

      // Count :root occurrences - should have at least one for metadata
      const metadataSection = result.includes("Theme metadata for JavaScript");
      expectTrue(metadataSection, "Should have metadata comment");
    },
  },
];

export default createTestRunner("theme-compiler", testCases);
