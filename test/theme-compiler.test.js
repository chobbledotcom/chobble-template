import {
  extractRootVariables,
  generateThemeSwitcherContent,
  getThemeFiles,
  slugToTitle,
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

      expectTrue(
        result.includes("--color-bg: #001f3f"),
        "Should include bg variable",
      );
      expectTrue(
        result.includes("--color-text: #7fdbff"),
        "Should include text variable",
      );
      expectTrue(
        !result.includes("background"),
        "Should not include body styles",
      );
      expectTrue(
        !result.includes("Ocean Theme"),
        "Should not include comments",
      );
    },
  },
  {
    name: "extractRootVariables-complex-values",
    description:
      "Handles CSS variables with complex values like in real themes",
    test: () => {
      // Values taken from actual theme files
      const content = `:root {
  --font-family-heading: "Share Tech Mono", "Lucida Console", monospace;
  --box-shadow: 0 0 10px #00ff00;
  --border: 2px solid #00ff00;
}`;
      const result = extractRootVariables(content);

      expectTrue(
        result.includes("--font-family-heading:"),
        "Should handle quoted font stacks",
      );
      expectTrue(
        result.includes("--box-shadow: 0 0 10px #00ff00"),
        "Should handle box-shadow values",
      );
      expectTrue(
        result.includes("--border: 2px solid #00ff00"),
        "Should handle border shorthand",
      );
    },
  },

  // ============================================
  // slugToTitle tests
  // ============================================
  {
    name: "slugToTitle-hyphenated",
    description: "Converts hyphenated name to title case (90s-computer)",
    test: () => {
      // Real theme name from the codebase
      const result = slugToTitle("90s-computer");
      expectStrictEqual(result, "90s Computer", "Should convert to title case");
    },
  },
  {
    name: "slugToTitle-single-word",
    description: "Capitalizes single word theme name (ocean)",
    test: () => {
      // Real theme name from the codebase
      const result = slugToTitle("ocean");
      expectStrictEqual(result, "Ocean", "Should capitalize single word");
    },
  },
  {
    name: "slugToTitle-multiple-hyphens",
    description: "Handles multiple hyphenated words (old-mac)",
    test: () => {
      // Real theme name from the codebase
      const result = slugToTitle("old-mac");
      expectStrictEqual(result, "Old Mac", "Should handle multiple hyphens");
    },
  },

  // ============================================
  // getThemeFiles tests
  // ============================================
  {
    name: "getThemeFiles-returns-themes",
    description: "Returns array of theme objects from src/css",
    test: () => {
      const themes = getThemeFiles();

      expectTrue(Array.isArray(themes), "Should return an array");
      expectTrue(themes.length >= 8, "Should find all theme files");
    },
  },
  {
    name: "getThemeFiles-object-structure",
    description: "Each theme has name, file, and content properties",
    test: () => {
      const themes = getThemeFiles();
      const theme = themes.find((t) => t.name === "ocean");

      expectTrue(theme !== undefined, "Should find ocean theme");
      expectStrictEqual(theme.file, "theme-ocean.scss", "File matches pattern");
      expectTrue(
        theme.content.includes(":root"),
        "Content contains :root block",
      );
      expectTrue(
        theme.content.includes("--color-bg"),
        "Content contains CSS variables",
      );
    },
  },
  {
    name: "getThemeFiles-excludes-switcher",
    description:
      "Excludes theme-switcher.scss and theme-switcher-compiled.scss",
    test: () => {
      const themes = getThemeFiles();
      const names = themes.map((t) => t.name);

      expectTrue(
        !names.includes("switcher"),
        "Should not include theme-switcher",
      );
      expectTrue(
        !names.includes("switcher-compiled"),
        "Should not include theme-switcher-compiled",
      );
    },
  },
  {
    name: "getThemeFiles-sorted-alphabetically",
    description: "Themes are sorted alphabetically by name",
    test: () => {
      const themes = getThemeFiles();
      const names = themes.map((t) => t.name);

      for (let i = 1; i < names.length; i++) {
        expectTrue(
          names[i - 1].localeCompare(names[i]) <= 0,
          `${names[i - 1]} should come before ${names[i]}`,
        );
      }
    },
  },

  // ============================================
  // generateThemeSwitcherContent tests
  // ============================================
  {
    name: "generateThemeSwitcherContent-header-comment",
    description: "Output includes warning header about auto-generation",
    test: () => {
      const result = generateThemeSwitcherContent();

      expectTrue(
        result.includes("Auto-generated theme definitions"),
        "Should explain purpose",
      );
      expectTrue(
        result.includes("DO NOT EDIT"),
        "Should warn against manual editing",
      );
    },
  },
  {
    name: "generateThemeSwitcherContent-theme-selectors",
    description: "Generates html[data-theme] selector for each theme",
    test: () => {
      const result = generateThemeSwitcherContent();
      const themes = getThemeFiles();

      // Verify each theme has a corresponding selector
      for (const theme of themes) {
        expectTrue(
          result.includes(`html[data-theme="${theme.name}"]`),
          `Should have selector for ${theme.name} theme`,
        );
      }
    },
  },
  {
    name: "generateThemeSwitcherContent-variables-in-selectors",
    description: "Theme selectors contain the extracted CSS variables",
    test: () => {
      const result = generateThemeSwitcherContent();

      // Ocean theme has --color-bg: #001f3f - verify it's in the ocean selector
      const oceanSelectorStart = result.indexOf('html[data-theme="ocean"]');
      const oceanSelectorEnd = result.indexOf("}", oceanSelectorStart);
      const oceanBlock = result.slice(oceanSelectorStart, oceanSelectorEnd);

      expectTrue(
        oceanBlock.includes("--color-bg"),
        "Ocean selector should contain --color-bg variable",
      );
    },
  },
  {
    name: "generateThemeSwitcherContent-theme-list-variable",
    description: "Generates --theme-list with default and all theme names",
    test: () => {
      const result = generateThemeSwitcherContent();
      const themes = getThemeFiles();

      expectTrue(
        result.includes("--theme-list:"),
        "Should have --theme-list variable",
      );
      expectTrue(
        result.includes('"default,'),
        "Theme list should start with default",
      );

      // Check all themes are in the list
      for (const theme of themes) {
        expectTrue(
          result.includes(theme.name),
          `Theme list should include ${theme.name}`,
        );
      }
    },
  },
  {
    name: "generateThemeSwitcherContent-display-name-variables",
    description: "Generates --theme-X-name display name for each theme",
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
      expectTrue(
        result.includes('--theme-90s-computer-name: "90s Computer"'),
        "Should have 90s-computer display name with proper capitalization",
      );
    },
  },
  {
    name: "generateThemeSwitcherContent-metadata-section",
    description: "Has metadata section with :root for JavaScript access",
    test: () => {
      const result = generateThemeSwitcherContent();

      expectTrue(
        result.includes("Theme metadata for JavaScript access"),
        "Should have metadata comment",
      );

      // The metadata :root block should contain --theme-list
      const metadataStart = result.indexOf("Theme metadata");
      const afterMetadata = result.slice(metadataStart);
      expectTrue(
        afterMetadata.includes(":root {"),
        "Metadata section should have :root block",
      );
    },
  },
];

export default createTestRunner("theme-compiler", testCases);
