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

  // shouldIncludeScopedVar tests - compares against global value for same var
  {
    name: "shouldIncludeScopedVar-different-from-global",
    description: "Returns true when value differs from global",
    test: () => {
      // Different colors should be included
      expectTrue(shouldIncludeScopedVar("#ff0000", "#ffffff"));
      expectTrue(shouldIncludeScopedVar("#000000", "#ffffff")); // Black is valid!
      expectTrue(shouldIncludeScopedVar("#ffffff", "#000000"));
    },
  },
  {
    name: "shouldIncludeScopedVar-same-as-global",
    description: "Returns false when value equals global (no override needed)",
    test: () => {
      expectFalse(shouldIncludeScopedVar("#ffffff", "#ffffff"));
      expectFalse(shouldIncludeScopedVar("#000000", "#000000"));
      expectFalse(shouldIncludeScopedVar("2px solid #333", "2px solid #333"));
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
  {
    name: "shouldIncludeScopedVar-no-global",
    description: "Returns true when no global value exists",
    test: () => {
      // If there's no global value, include any non-empty value
      expectTrue(shouldIncludeScopedVar("#ff0000", undefined));
      expectTrue(shouldIncludeScopedVar("#000000", undefined));
      expectTrue(shouldIncludeScopedVar("#ffffff", ""));
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
    name: "collectScopeVarsFromFormData-includes-black-when-different",
    description: "Includes #000000 when it differs from global (black is valid)",
    test: () => {
      const formData = {
        "--color-bg": "#000000", // User chose black
        "--color-text": "#ff0000", // User chose red
      };
      const globals = { "--color-bg": "#ffffff", "--color-text": "#000000" };
      const result = collectScopeVarsFromFormData(formData, globals);
      // Both should be included because they differ from their globals
      expectDeepEqual(result, {
        "--color-bg": "#000000", // Different from global #ffffff
        "--color-text": "#ff0000", // Different from global #000000
      });
    },
  },
  {
    name: "collectScopeVarsFromFormData-excludes-same-as-global",
    description: "Excludes values that match their global counterpart",
    test: () => {
      const formData = {
        "--color-bg": "#ffffff", // Same as global
        "--color-text": "#ff0000", // Different from global
      };
      const globals = { "--color-bg": "#ffffff", "--color-text": "#000000" };
      const result = collectScopeVarsFromFormData(formData, globals);
      // Only color-text should be included (color-bg matches global)
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

// Comprehensive form data to CSS output tests
const formDataTestCases = [
  // Test: All global inputs should appear in :root
  {
    name: "global-colors-appear-in-root",
    description: "Global color inputs should appear in :root block",
    test: () => {
      const globalVars = {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
        "--color-link": "#0000ff",
        "--color-link-hover": "#ff0000",
      };
      const result = generateThemeCss(globalVars, {}, []);

      expectTrue(result.includes(":root {"));
      expectTrue(result.includes("--color-bg: #ffffff;"));
      expectTrue(result.includes("--color-text: #000000;"));
      expectTrue(result.includes("--color-link: #0000ff;"));
      expectTrue(result.includes("--color-link-hover: #ff0000;"));
    },
  },
  {
    name: "global-layout-vars-appear-in-root",
    description: "Global layout inputs should appear in :root block",
    test: () => {
      const globalVars = {
        "--border-radius": "5px",
        "--border": "2px solid #333333",
        "--box-shadow": "10px 10px 0 rgba(0,0,0,0.3)",
        "--width-content": "1200px",
        "--width-card": "300px",
        "--width-card-medium": "500px",
        "--width-card-wide": "900px",
      };
      const result = generateThemeCss(globalVars, {}, []);

      expectTrue(result.includes("--border-radius: 5px;"));
      expectTrue(result.includes("--border: 2px solid #333333;"));
      expectTrue(result.includes("--box-shadow: 10px 10px 0 rgba(0,0,0,0.3);"));
      expectTrue(result.includes("--width-content: 1200px;"));
    },
  },
  {
    name: "global-font-vars-appear-in-root",
    description: "Global font inputs should appear in :root block",
    test: () => {
      const globalVars = {
        "--font-family-heading": "Georgia, serif",
        "--font-family-body": "Arial, sans-serif",
        "--line-height": "1.6",
        "--link-decoration": "underline",
        "--link-decoration-hover": "none",
        "--link-decoration-style": "dashed",
      };
      const result = generateThemeCss(globalVars, {}, []);

      expectTrue(result.includes("--font-family-heading: Georgia, serif;"));
      expectTrue(result.includes("--font-family-body: Arial, sans-serif;"));
      expectTrue(result.includes("--line-height: 1.6;"));
      expectTrue(result.includes("--link-decoration: underline;"));
    },
  },

  // Test: Each scope's inputs should generate correct scoped block
  {
    name: "header-scope-generates-header-block",
    description: "Header scoped inputs should generate header {} block",
    test: () => {
      const scopeVars = {
        header: {
          "--color-bg": "#ff0000",
          "--color-text": "#ffffff",
          "--color-link": "#00ff00",
          "--color-link-hover": "#0000ff",
          "--border": "3px solid #000",
        },
      };
      const result = generateThemeCss({}, scopeVars, []);

      expectTrue(result.includes("header {"));
      expectTrue(result.includes("--color-bg: #ff0000;"));
      expectTrue(result.includes("--color-text: #ffffff;"));
      expectTrue(result.includes("--color-link: #00ff00;"));
      expectTrue(result.includes("--color-link-hover: #0000ff;"));
      expectTrue(result.includes("--border: 3px solid #000;"));
    },
  },
  {
    name: "nav-scope-generates-nav-block",
    description: "Nav scoped inputs should generate nav {} block",
    test: () => {
      const scopeVars = {
        nav: {
          "--color-bg": "#333333",
          "--color-text": "#cccccc",
          "--color-link": "#00ffff",
          "--color-link-hover": "#ffffff",
          "--border": "1px solid #666",
        },
      };
      const result = generateThemeCss({}, scopeVars, []);

      expectTrue(result.includes("nav {"), "Should have nav block");
      expectTrue(
        result.includes("--color-bg: #333333;"),
        "Should have nav color-bg",
      );
      expectTrue(
        result.includes("--color-text: #cccccc;"),
        "Should have nav color-text",
      );
      expectTrue(
        result.includes("--color-link: #00ffff;"),
        "Should have nav color-link",
      );
      expectTrue(
        result.includes("--color-link-hover: #ffffff;"),
        "Should have nav color-link-hover",
      );
    },
  },
  {
    name: "article-scope-generates-article-block",
    description: "Article scoped inputs should generate article {} block",
    test: () => {
      const scopeVars = {
        article: {
          "--color-bg": "#f5f5f5",
          "--color-text": "#222222",
        },
      };
      const result = generateThemeCss({}, scopeVars, []);

      expectTrue(result.includes("article {"));
      expectTrue(result.includes("--color-bg: #f5f5f5;"));
      expectTrue(result.includes("--color-text: #222222;"));
    },
  },
  {
    name: "form-scope-generates-form-block",
    description: "Form scoped inputs should generate form {} block",
    test: () => {
      const scopeVars = {
        form: {
          "--color-bg": "#eeeeee",
          "--border": "2px dashed #999",
        },
      };
      const result = generateThemeCss({}, scopeVars, []);

      expectTrue(result.includes("form {"));
      expectTrue(result.includes("--color-bg: #eeeeee;"));
      expectTrue(result.includes("--border: 2px dashed #999;"));
    },
  },
  {
    name: "button-scope-generates-button-block",
    description: "Button scoped inputs should generate button selector block",
    test: () => {
      const scopeVars = {
        button: {
          "--color-bg": "#007bff",
          "--color-link": "#ffffff",
        },
      };
      const result = generateThemeCss({}, scopeVars, []);

      expectTrue(result.includes("button,"));
      expectTrue(result.includes(".button,"));
      expectTrue(result.includes('input[type="submit"]'));
      expectTrue(result.includes("--color-bg: #007bff;"));
      expectTrue(result.includes("--color-link: #ffffff;"));
    },
  },

  // Test: All scopes together
  {
    name: "all-scopes-together",
    description: "All scopes can be set simultaneously",
    test: () => {
      const globalVars = { "--color-bg": "#ffffff" };
      const scopeVars = {
        header: { "--color-text": "#111" },
        nav: { "--color-link": "#222" },
        article: { "--color-bg": "#333" },
        form: { "--border": "1px solid #444" },
        button: { "--color-bg": "#555" },
      };
      const result = generateThemeCss(globalVars, scopeVars, []);

      expectTrue(result.includes(":root {"));
      expectTrue(result.includes("header {"));
      expectTrue(result.includes("nav {"));
      expectTrue(result.includes("article {"));
      expectTrue(result.includes("form {"));
      expectTrue(result.includes("button,"));
    },
  },

  // Test: shouldIncludeScopedVar compares against correct global
  {
    name: "scoped-var-compared-to-its-own-global",
    description:
      "Scoped vars should be compared against the global value for the SAME variable",
    test: () => {
      // If nav's --color-link is #ffffff and global --color-link is #000000,
      // it should be included because it differs from its own global
      expectTrue(
        shouldIncludeScopedVar("#ffffff", "#000000"),
        "#ffffff should be included (different from global --color-link)",
      );

      // If nav's --color-link is #ffffff and global --color-link is also #ffffff,
      // it should NOT be included (no override needed)
      expectFalse(
        shouldIncludeScopedVar("#ffffff", "#ffffff"),
        "#ffffff should NOT be included (same as global --color-link)",
      );

      // Black (#000000) IS a valid color choice
      expectTrue(
        shouldIncludeScopedVar("#000000", "#ffffff"),
        "#000000 should be included when global is different",
      );
    },
  },
  {
    name: "each-scoped-var-should-be-independent",
    description:
      "Each scoped variable should be evaluated independently, not against a single default",
    test: () => {
      // This test documents the expected behavior:
      // If I set nav's --color-link to #ff0000, it should appear in output
      // regardless of what --color-bg is set to

      const scopeVars = {
        nav: {
          "--color-link": "#ff0000", // Different from any default
        },
      };
      const result = generateThemeCss({}, scopeVars, []);

      expectTrue(
        result.includes("nav {"),
        "nav block should appear when nav vars are set",
      );
      expectTrue(
        result.includes("--color-link: #ff0000;"),
        "color-link should appear in nav block",
      );
    },
  },

  // Test: collectScopeVarsFromFormData behavior
  {
    name: "collectScopeVarsFromFormData-independent-vars",
    description:
      "Each variable should only be filtered if it matches ITS OWN default",
    test: () => {
      // Simulate form data where user set specific values
      const formData = {
        "--color-bg": "#ff0000", // User set this
        "--color-text": "#00ff00", // User set this
        "--color-link": "#0000ff", // User set this
      };

      // Each variable's own default
      const defaults = {
        "--color-bg": "#ffffff", // bg default
        "--color-text": "#000000", // text default
        "--color-link": "#000000", // link default
      };

      const result = collectScopeVarsFromFormData(formData, defaults);

      // All should be included since none match their OWN default
      expectTrue(
        result["--color-bg"] === "#ff0000",
        "color-bg should be included",
      );
      expectTrue(
        result["--color-text"] === "#00ff00",
        "color-text should be included",
      );
      expectTrue(
        result["--color-link"] === "#0000ff",
        "color-link should be included",
      );
    },
  },

  // Document all expected form inputs
  {
    name: "document-all-global-inputs",
    description: "Documents all expected global (non-scoped) inputs",
    test: () => {
      // This test documents what inputs exist and should work
      const expectedGlobalInputs = [
        // Colors tab
        "color-bg",
        "color-text",
        "color-link",
        "color-link-hover",
        // Layout tab
        "border-radius",
        "border", // composite: border-width, border-style, border-color
        "box-shadow",
        "width-content",
        "width-card",
        "width-card-medium",
        "width-card-wide",
        // Fonts tab
        "font-family-heading",
        "font-family-body",
        "line-height",
        "link-decoration",
        "link-decoration-hover",
        "link-decoration-style",
      ];

      // Just verify the list is complete (17 global inputs)
      expectStrictEqual(expectedGlobalInputs.length, 17);
    },
  },
  {
    name: "document-all-scoped-inputs",
    description: "Documents all expected scoped inputs per scope",
    test: () => {
      // Each scope has these inputs:
      const inputsPerScope = [
        "color-bg",
        "color-text",
        "color-link",
        "color-link-hover",
        "border", // composite
      ];

      // 5 scopes × 5 inputs = 25 scoped inputs
      expectStrictEqual(SCOPES.length, 5);
      expectStrictEqual(inputsPerScope.length, 5);

      // Total scoped inputs: 25
      // Plus 2 select-class inputs (header-decoration, main-heading-decoration)
    },
  },
];

// Combine all test cases
const allTestCases = [...testCases, ...formDataTestCases];

createTestRunner("theme-editor", allTestCases);
