import {
  assert,
  createTestRunner,
  expectDeepEqual,
  expectStrictEqual,
  expectTrue,
  expectFalse,
} from "./test-utils.js";
import {
  SCOPES,
  SCOPE_SELECTORS,
  parseCssBlock,
  parseThemeContent,
  parseBorderValue,
  generateThemeCss,
  shouldIncludeScopedVar,
  collectScopeVarsFromFormData,
} from "../src/assets/js/theme-editor-lib.js";

const testCases = [
  // parseCssBlock tests
  {
    name: "parseCssBlock-empty",
    description: "Returns empty object for empty/null input",
    test: () => {
      expectDeepEqual(parseCssBlock(""), {});
      expectDeepEqual(parseCssBlock(null), {});
      expectDeepEqual(parseCssBlock(undefined), {});
    },
  },
  {
    name: "parseCssBlock-single-variable",
    description: "Parses a single CSS variable",
    test: () => {
      const result = parseCssBlock("--color-bg: #ffffff;");
      expectDeepEqual(result, { "--color-bg": "#ffffff" });
    },
  },
  {
    name: "parseCssBlock-multiple-variables",
    description: "Parses multiple CSS variables",
    test: () => {
      const css = `
        --color-bg: #ffffff;
        --color-text: #000000;
        --border: 2px solid #333;
      `;
      const result = parseCssBlock(css);
      expectDeepEqual(result, {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
        "--border": "2px solid #333",
      });
    },
  },
  {
    name: "parseCssBlock-with-whitespace",
    description: "Handles various whitespace correctly",
    test: () => {
      const css = "  --color-bg:   #fff  ;   --color-text:#000;";
      const result = parseCssBlock(css);
      expectDeepEqual(result, {
        "--color-bg": "#fff",
        "--color-text": "#000",
      });
    },
  },
  {
    name: "parseCssBlock-ignores-non-variables",
    description: "Ignores non-CSS-variable properties",
    test: () => {
      const css = `
        --color-bg: #fff;
        background: red;
        --color-text: #000;
      `;
      const result = parseCssBlock(css);
      expectDeepEqual(result, {
        "--color-bg": "#fff",
        "--color-text": "#000",
      });
    },
  },

  // parseThemeContent tests
  {
    name: "parseThemeContent-empty",
    description: "Returns empty structure for empty input",
    test: () => {
      const result = parseThemeContent("");
      expectDeepEqual(result, { root: {}, scopes: {}, bodyClasses: [] });
    },
  },
  {
    name: "parseThemeContent-root-only",
    description: "Parses :root block correctly",
    test: () => {
      const theme = `
:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
}
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(result.root, {
        "--color-bg": "#241f31",
        "--color-text": "#9a9996",
      });
      expectDeepEqual(result.scopes, {});
      expectDeepEqual(result.bodyClasses, []);
    },
  },
  {
    name: "parseThemeContent-with-header-scope",
    description: "Parses header scoped block",
    test: () => {
      const theme = `
:root {
  --color-bg: #fff;
}

header {
  --color-text: #ffffff;
  --color-bg: #ff0000;
}
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(result.scopes.header, {
        "--color-text": "#ffffff",
        "--color-bg": "#ff0000",
      });
    },
  },
  {
    name: "parseThemeContent-with-nav-scope",
    description: "Parses nav scoped block",
    test: () => {
      const theme = `
:root { --color-bg: #fff; }

nav {
  --color-link: #0000ff;
}
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(result.scopes.nav, {
        "--color-link": "#0000ff",
      });
    },
  },
  {
    name: "parseThemeContent-with-article-scope",
    description: "Parses article scoped block",
    test: () => {
      const theme = `
article {
  --color-bg: #f0f0f0;
}
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(result.scopes.article, {
        "--color-bg": "#f0f0f0",
      });
    },
  },
  {
    name: "parseThemeContent-with-form-scope",
    description: "Parses form scoped block",
    test: () => {
      const theme = `
form {
  --color-bg: #eee;
  --border: 1px solid #ccc;
}
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(result.scopes.form, {
        "--color-bg": "#eee",
        "--border": "1px solid #ccc",
      });
    },
  },
  {
    name: "parseThemeContent-with-button-scope",
    description: "Parses button multi-selector scoped block",
    test: () => {
      const theme = `
button,
.button,
input[type="submit"] {
  --color-bg: #007bff;
  --color-link: #ffffff;
}
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(result.scopes.button, {
        "--color-bg": "#007bff",
        "--color-link": "#ffffff",
      });
    },
  },
  {
    name: "parseThemeContent-with-body-classes",
    description: "Parses body_classes comment",
    test: () => {
      const theme = `
:root { --color-bg: #fff; }

/* body_classes: header-centered-dark, headings-centered */
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(result.bodyClasses, [
        "header-centered-dark",
        "headings-centered",
      ]);
    },
  },
  {
    name: "parseThemeContent-full-theme",
    description: "Parses complete theme with all sections",
    test: () => {
      const theme = `
:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
  --color-link: #f6f5f4;
}

header {
  --color-text: #ffffff;
}

nav {
  --color-bg: #333;
}

/* body_classes: header-centered-dark */
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(result.root, {
        "--color-bg": "#241f31",
        "--color-text": "#9a9996",
        "--color-link": "#f6f5f4",
      });
      expectDeepEqual(result.scopes.header, { "--color-text": "#ffffff" });
      expectDeepEqual(result.scopes.nav, { "--color-bg": "#333" });
      expectDeepEqual(result.bodyClasses, ["header-centered-dark"]);
    },
  },

  // parseBorderValue tests
  {
    name: "parseBorderValue-valid",
    description: "Parses valid border value",
    test: () => {
      const result = parseBorderValue("2px solid #000000");
      expectDeepEqual(result, { width: 2, style: "solid", color: "#000000" });
    },
  },
  {
    name: "parseBorderValue-different-styles",
    description: "Parses different border styles",
    test: () => {
      expectDeepEqual(parseBorderValue("3px dashed #ff0000"), {
        width: 3,
        style: "dashed",
        color: "#ff0000",
      });
      expectDeepEqual(parseBorderValue("1px dotted #00ff00"), {
        width: 1,
        style: "dotted",
        color: "#00ff00",
      });
    },
  },
  {
    name: "parseBorderValue-invalid",
    description: "Returns null for invalid border values",
    test: () => {
      expectStrictEqual(parseBorderValue(null), null);
      expectStrictEqual(parseBorderValue(""), null);
      expectStrictEqual(parseBorderValue("invalid"), null);
    },
  },

  // shouldIncludeScopedVar tests
  {
    name: "shouldIncludeScopedVar-different-values",
    description: "Returns true when value differs from default",
    test: () => {
      expectTrue(shouldIncludeScopedVar("#ff0000", "#ffffff"));
      expectTrue(shouldIncludeScopedVar("#123456", "#000000"));
    },
  },
  {
    name: "shouldIncludeScopedVar-same-values",
    description: "Returns false when value equals default",
    test: () => {
      expectFalse(shouldIncludeScopedVar("#ffffff", "#ffffff"));
      expectFalse(shouldIncludeScopedVar("2px solid #333", "2px solid #333"));
    },
  },
  {
    name: "shouldIncludeScopedVar-black-value",
    description: "Returns false for #000000 (unset color picker)",
    test: () => {
      expectFalse(shouldIncludeScopedVar("#000000", "#ffffff"));
    },
  },
  {
    name: "shouldIncludeScopedVar-empty-value",
    description: "Returns false for empty/null values",
    test: () => {
      expectFalse(shouldIncludeScopedVar("", "#ffffff"));
      expectFalse(shouldIncludeScopedVar(null, "#ffffff"));
      expectFalse(shouldIncludeScopedVar(undefined, "#ffffff"));
    },
  },

  // collectScopeVarsFromFormData tests
  {
    name: "collectScopeVarsFromFormData-filters-defaults",
    description: "Filters out values that match defaults",
    test: () => {
      const formData = {
        "--color-bg": "#ff0000",
        "--color-text": "#ffffff", // same as default
        "--color-link": "#0000ff",
      };
      const defaults = {
        "--color-bg": "#ffffff",
        "--color-text": "#ffffff",
        "--color-link": "#000000",
      };
      const result = collectScopeVarsFromFormData(formData, defaults);
      expectDeepEqual(result, {
        "--color-bg": "#ff0000",
        "--color-link": "#0000ff",
      });
    },
  },
  {
    name: "collectScopeVarsFromFormData-filters-black",
    description: "Filters out #000000 values (unset color picker)",
    test: () => {
      const formData = {
        "--color-bg": "#000000",
        "--color-text": "#ff0000",
      };
      const defaults = { "--color-bg": "#ffffff", "--color-text": "#000000" };
      const result = collectScopeVarsFromFormData(formData, defaults);
      expectDeepEqual(result, { "--color-text": "#ff0000" });
    },
  },

  // generateThemeCss tests
  {
    name: "generateThemeCss-root-only",
    description: "Generates CSS with only :root block",
    test: () => {
      const globalVars = {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
      };
      const result = generateThemeCss(globalVars, {}, []);
      expectTrue(result.includes(":root {"));
      expectTrue(result.includes("--color-bg: #ffffff;"));
      expectTrue(result.includes("--color-text: #000000;"));
    },
  },
  {
    name: "generateThemeCss-with-scopes",
    description: "Generates CSS with scoped blocks",
    test: () => {
      const globalVars = { "--color-bg": "#ffffff" };
      const scopeVars = {
        header: { "--color-text": "#ffffff" },
        nav: { "--color-link": "#0000ff" },
      };
      const result = generateThemeCss(globalVars, scopeVars, []);
      expectTrue(result.includes("header {"));
      expectTrue(result.includes("  --color-text: #ffffff;"));
      expectTrue(result.includes("nav {"));
      expectTrue(result.includes("  --color-link: #0000ff;"));
    },
  },
  {
    name: "generateThemeCss-with-button-scope",
    description: "Generates correct multi-selector for buttons",
    test: () => {
      const scopeVars = {
        button: { "--color-bg": "#007bff" },
      };
      const result = generateThemeCss({}, scopeVars, []);
      expectTrue(result.includes("button,"));
      expectTrue(result.includes(".button,"));
      expectTrue(result.includes('input[type="submit"]'));
    },
  },
  {
    name: "generateThemeCss-with-body-classes",
    description: "Generates body_classes comment",
    test: () => {
      const result = generateThemeCss({}, {}, ["header-centered-dark"]);
      expectTrue(result.includes("/* body_classes: header-centered-dark */"));
    },
  },
  {
    name: "generateThemeCss-empty-scopes-omitted",
    description: "Does not include empty scope blocks",
    test: () => {
      const scopeVars = {
        header: { "--color-text": "#fff" },
        nav: {}, // empty - should not appear
        article: {}, // empty - should not appear
      };
      const result = generateThemeCss({}, scopeVars, []);
      expectTrue(result.includes("header {"));
      expectFalse(result.includes("nav {"));
      expectFalse(result.includes("article {"));
    },
  },

  // SCOPES and SCOPE_SELECTORS tests
  {
    name: "scopes-defined",
    description: "All expected scopes are defined",
    test: () => {
      expectDeepEqual(SCOPES, ["header", "nav", "article", "form", "button"]);
    },
  },
  {
    name: "scope-selectors-defined",
    description: "All scope selectors are correctly defined",
    test: () => {
      expectStrictEqual(SCOPE_SELECTORS.header, "header");
      expectStrictEqual(SCOPE_SELECTORS.nav, "nav");
      expectStrictEqual(SCOPE_SELECTORS.article, "article");
      expectStrictEqual(SCOPE_SELECTORS.form, "form");
      expectTrue(SCOPE_SELECTORS.button.includes("button"));
      expectTrue(SCOPE_SELECTORS.button.includes(".button"));
      expectTrue(SCOPE_SELECTORS.button.includes('input[type="submit"]'));
    },
  },

  // Bug regression tests - ensure scopes work even when not in original theme
  {
    name: "missing-scopes-should-be-processable",
    description:
      "Theme with only :root should still allow new scopes to be added",
    test: () => {
      // This test documents the bug where if a theme had no header/nav/etc blocks,
      // the editor wouldn't allow adding them. The fix ensures all scopes are
      // always processable, regardless of what's in the original theme.
      const themeWithOnlyRoot = `
:root {
  --color-bg: #ffffff;
  --color-text: #000000;
}
      `;

      const parsed = parseThemeContent(themeWithOnlyRoot);

      // All scopes should be empty (not in original theme)
      SCOPES.forEach((scope) => {
        expectStrictEqual(
          parsed.scopes[scope],
          undefined,
          `Scope '${scope}' should not exist in parsed theme`,
        );
      });

      // But we should still be able to generate a theme with new scopes
      const newScopeVars = {
        header: { "--color-text": "#ffffff" },
        nav: { "--color-bg": "#333333", "--color-link": "#00ff00" },
      };

      const generated = generateThemeCss(parsed.root, newScopeVars, []);

      // The generated CSS should include the new scopes
      expectTrue(
        generated.includes("header {"),
        "Should be able to add header scope to theme that didn't have one",
      );
      expectTrue(
        generated.includes("nav {"),
        "Should be able to add nav scope to theme that didn't have one",
      );
      expectTrue(generated.includes("--color-text: #ffffff;"));
      expectTrue(generated.includes("--color-link: #00ff00;"));
    },
  },
  {
    name: "all-scopes-can-be-added-to-empty-theme",
    description: "All scopes can be added to a theme that has none",
    test: () => {
      const emptyTheme = `:root { --color-bg: #fff; }`;
      const parsed = parseThemeContent(emptyTheme);

      // Create scope vars for ALL scopes
      const allScopeVars = {};
      SCOPES.forEach((scope) => {
        allScopeVars[scope] = { "--color-bg": "#ff0000" };
      });

      const generated = generateThemeCss(parsed.root, allScopeVars, []);

      // All scopes should appear in output
      expectTrue(generated.includes("header {"), "header scope should be added");
      expectTrue(generated.includes("nav {"), "nav scope should be added");
      expectTrue(generated.includes("article {"), "article scope should be added");
      expectTrue(generated.includes("form {"), "form scope should be added");
      expectTrue(generated.includes("button,"), "button scope should be added");
    },
  },

  // Round-trip test
  {
    name: "roundtrip-parse-generate",
    description: "Parsing and regenerating produces equivalent output",
    test: () => {
      const originalTheme = `
:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
}

header {
  --color-text: #ffffff;
}

/* body_classes: header-centered-dark */
      `;

      const parsed = parseThemeContent(originalTheme);

      // Convert parsed root to the format generateThemeCss expects
      const generated = generateThemeCss(
        parsed.root,
        parsed.scopes,
        parsed.bodyClasses,
      );

      // Re-parse the generated CSS
      const reparsed = parseThemeContent(generated);

      expectDeepEqual(reparsed.root, parsed.root);
      expectDeepEqual(reparsed.scopes, parsed.scopes);
      expectDeepEqual(reparsed.bodyClasses, parsed.bodyClasses);
    },
  },
];

createTestRunner("theme-editor", testCases);
