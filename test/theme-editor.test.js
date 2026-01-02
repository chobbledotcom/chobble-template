import {
  GLOBAL_INPUTS,
  getInputCounts,
  getScopedVarNames,
  getScopes,
  SCOPED_INPUTS,
} from "#assets/theme-editor-config.js";
import {
  filterScopeVars,
  generateThemeCss,
  parseBorderValue,
  parseCssBlock,
  parseThemeContent,
  SCOPE_SELECTORS,
  SCOPES,
  shouldIncludeScopedVar,
} from "#assets/theme-editor-lib.js";
import {
  createTestRunner,
  expectDeepEqual,
  expectFalse,
  expectStrictEqual,
  expectTrue,
} from "#test/test-utils.js";

// ============================================
// Unit Tests - parseCssBlock
// ============================================

const parseCssBlockTests = [
  {
    name: "parseCssBlock-parses-variables",
    description: "Parses CSS variables from block content",
    test: () => {
      const css = `
        --color-bg: #ffffff;
        --color-text: #000000;
        --border: 2px solid #333;
      `;
      const result = parseCssBlock(css);
      expectDeepEqual(
        result,
        {
          "--color-bg": "#ffffff",
          "--color-text": "#000000",
          "--border": "2px solid #333",
        },
        "Should parse all CSS variables from block content",
      );
    },
  },
  {
    name: "parseCssBlock-ignores-non-variables",
    description: "Ignores regular CSS properties",
    test: () => {
      const css = `
        --color-bg: #fff;
        background: red;
        --color-text: #000;
      `;
      const result = parseCssBlock(css);
      expectDeepEqual(
        result,
        {
          "--color-bg": "#fff",
          "--color-text": "#000",
        },
        "Should only include CSS variables, ignoring regular properties",
      );
    },
  },
  {
    name: "parseCssBlock-handles-empty-input",
    description: "Returns empty object for empty/null input",
    test: () => {
      expectDeepEqual(
        parseCssBlock(""),
        {},
        "Empty string should return empty object",
      );
      expectDeepEqual(
        parseCssBlock(null),
        {},
        "Null should return empty object",
      );
      expectDeepEqual(
        parseCssBlock(undefined),
        {},
        "Undefined should return empty object",
      );
    },
  },
  {
    name: "parseCssBlock-handles-whitespace-variations",
    description: "Handles various whitespace in CSS",
    test: () => {
      const css = `--color-bg:#fff;--color-text:  #000  ;`;
      const result = parseCssBlock(css);
      expectDeepEqual(
        result,
        {
          "--color-bg": "#fff",
          "--color-text": "#000",
        },
        "Should handle whitespace variations",
      );
    },
  },
];

// ============================================
// Unit Tests - parseThemeContent
// ============================================

const parseThemeContentTests = [
  {
    name: "parseThemeContent-parses-root",
    description: "Parses :root variables",
    test: () => {
      const theme = `
:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
}
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(
        result.root,
        {
          "--color-bg": "#241f31",
          "--color-text": "#9a9996",
        },
        "Should parse :root variables",
      );
    },
  },
  {
    name: "parseThemeContent-parses-header-scope",
    description: "Parses header scope variables",
    test: () => {
      const theme = `
:root { --color-bg: #fff; }
header { --color-text: #ffffff; --color-bg: #333; }
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(
        result.scopes.header,
        { "--color-text": "#ffffff", "--color-bg": "#333" },
        "Should parse header scope variables",
      );
    },
  },
  {
    name: "parseThemeContent-parses-nav-scope",
    description: "Parses nav scope variables",
    test: () => {
      const theme = `
:root { --color-bg: #fff; }
nav { --color-link: #00ff00; }
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(
        result.scopes.nav,
        { "--color-link": "#00ff00" },
        "Should parse nav scope variables",
      );
    },
  },
  {
    name: "parseThemeContent-parses-article-scope",
    description: "Parses article scope variables",
    test: () => {
      const theme = `
:root { --color-bg: #fff; }
article { --color-bg: #f0f0f0; }
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(
        result.scopes.article,
        { "--color-bg": "#f0f0f0" },
        "Should parse article scope variables",
      );
    },
  },
  {
    name: "parseThemeContent-parses-form-scope",
    description: "Parses form scope variables",
    test: () => {
      const theme = `
:root { --color-bg: #fff; }
form { --border: 1px solid #ccc; }
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(
        result.scopes.form,
        { "--border": "1px solid #ccc" },
        "Should parse form scope variables",
      );
    },
  },
  {
    name: "parseThemeContent-parses-button-scope",
    description: "Parses button multi-selector scope variables",
    test: () => {
      const theme = `
:root { --color-bg: #fff; }
button,
.button,
input[type="submit"] {
  --color-bg: #007bff;
}
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(
        result.scopes.button,
        { "--color-bg": "#007bff" },
        "Should parse button scope variables",
      );
    },
  },
  {
    name: "parseThemeContent-parses-body-classes",
    description: "Parses body_classes comment",
    test: () => {
      const theme = `
:root { --color-bg: #fff; }
/* body_classes: header-centered-dark, main-boxed */
      `;
      const result = parseThemeContent(theme);
      expectDeepEqual(
        result.bodyClasses,
        ["header-centered-dark", "main-boxed"],
        "Should parse body_classes comment",
      );
    },
  },
  {
    name: "parseThemeContent-handles-empty-input",
    description: "Returns empty structure for empty input",
    test: () => {
      const result = parseThemeContent("");
      expectDeepEqual(result.root, {}, "Empty input should have empty root");
      expectDeepEqual(
        result.scopes,
        {},
        "Empty input should have empty scopes",
      );
      expectDeepEqual(
        result.bodyClasses,
        [],
        "Empty input should have empty bodyClasses",
      );
    },
  },
];

// ============================================
// Unit Tests - parseBorderValue
// ============================================

const parseBorderValueTests = [
  {
    name: "parseBorderValue-parses-solid-border",
    description: "Parses solid border value into components",
    test: () => {
      expectDeepEqual(
        parseBorderValue("2px solid #000000"),
        { width: 2, style: "solid", color: "#000000" },
        "Should parse solid border correctly",
      );
    },
  },
  {
    name: "parseBorderValue-parses-dashed-border",
    description: "Parses dashed border value into components",
    test: () => {
      expectDeepEqual(
        parseBorderValue("3px dashed #ff0000"),
        { width: 3, style: "dashed", color: "#ff0000" },
        "Should parse dashed border correctly",
      );
    },
  },
  {
    name: "parseBorderValue-parses-dotted-border",
    description: "Parses dotted border value into components",
    test: () => {
      expectDeepEqual(
        parseBorderValue("1px dotted #333333"),
        { width: 1, style: "dotted", color: "#333333" },
        "Should parse dotted border correctly",
      );
    },
  },
  {
    name: "parseBorderValue-handles-invalid-input",
    description: "Returns null for invalid border values",
    test: () => {
      expectStrictEqual(
        parseBorderValue(""),
        null,
        "Empty string should return null",
      );
      expectStrictEqual(
        parseBorderValue(null),
        null,
        "Null should return null",
      );
      expectStrictEqual(
        parseBorderValue("invalid"),
        null,
        "Invalid format should return null",
      );
    },
  },
];

// ============================================
// Unit Tests - shouldIncludeScopedVar
// ============================================

const shouldIncludeScopedVarTests = [
  {
    name: "shouldIncludeScopedVar-includes-when-different",
    description: "Returns true when scoped value differs from global",
    test: () => {
      expectTrue(
        shouldIncludeScopedVar("#ff0000", "#ffffff"),
        "Should include red when global is white",
      );
      expectTrue(
        shouldIncludeScopedVar("#000000", "#ffffff"),
        "Should include black when global is white",
      );
      expectTrue(
        shouldIncludeScopedVar("3px solid #000", "2px solid #000"),
        "Should include when border width differs",
      );
    },
  },
  {
    name: "shouldIncludeScopedVar-excludes-when-same",
    description: "Returns false when scoped value equals global",
    test: () => {
      expectFalse(
        shouldIncludeScopedVar("#ffffff", "#ffffff"),
        "Should exclude when colors match exactly",
      );
      expectFalse(
        shouldIncludeScopedVar("2px solid #333", "2px solid #333"),
        "Should exclude when border values match exactly",
      );
    },
  },
  {
    name: "shouldIncludeScopedVar-excludes-empty",
    description: "Returns false for empty/null values",
    test: () => {
      expectFalse(
        shouldIncludeScopedVar("", "#ffffff"),
        "Should exclude empty string",
      );
      expectFalse(
        shouldIncludeScopedVar(null, "#ffffff"),
        "Should exclude null",
      );
      expectFalse(
        shouldIncludeScopedVar(undefined, "#ffffff"),
        "Should exclude undefined",
      );
    },
  },
  {
    name: "shouldIncludeScopedVar-black-preserved-when-intentional",
    description: "Black (#000000) is included when it differs from global",
    test: () => {
      // This tests the bug fix: black should be preserved when intentionally set
      expectTrue(
        shouldIncludeScopedVar("#000000", "#ffffff"),
        "Black should be included when global is white",
      );
      expectTrue(
        shouldIncludeScopedVar("#000000", "#333333"),
        "Black should be included when global is dark gray",
      );
      // But excluded when global is also black
      expectFalse(
        shouldIncludeScopedVar("#000000", "#000000"),
        "Black should be excluded when global is also black",
      );
    },
  },
];

// ============================================
// Unit Tests - filterScopeVars
// ============================================

const filterScopeVarsTests = [
  {
    name: "filterScopeVars-filters-matching-values",
    description: "Only includes values that differ from global",
    test: () => {
      const formData = {
        "--color-bg": "#ff0000",
        "--color-text": "#ffffff",
        "--color-link": "#0000ff",
      };
      const globals = {
        "--color-bg": "#ffffff",
        "--color-text": "#ffffff",
        "--color-link": "#000000",
      };
      const result = filterScopeVars(formData, globals);
      expectDeepEqual(
        result,
        {
          "--color-bg": "#ff0000",
          "--color-link": "#0000ff",
        },
        "Should only include variables that differ from global",
      );
    },
  },
  {
    name: "filterScopeVars-handles-all-matching",
    description: "Returns empty object when all values match global",
    test: () => {
      const formData = {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
      };
      const globals = {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
      };
      const result = filterScopeVars(formData, globals);
      expectDeepEqual(
        result,
        {},
        "Should return empty object when all values match",
      );
    },
  },
  {
    name: "filterScopeVars-handles-all-different",
    description: "Returns all values when none match global",
    test: () => {
      const formData = {
        "--color-bg": "#ff0000",
        "--color-text": "#00ff00",
      };
      const globals = {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
      };
      const result = filterScopeVars(formData, globals);
      expectDeepEqual(
        result,
        formData,
        "Should return all values when none match",
      );
    },
  },
  {
    name: "filterScopeVars-handles-missing-globals",
    description: "Includes values when global is missing",
    test: () => {
      const formData = {
        "--color-bg": "#ff0000",
        "--color-text": "#00ff00",
      };
      const globals = {
        "--color-bg": "#ffffff",
        // --color-text missing
      };
      const result = filterScopeVars(formData, globals);
      expectDeepEqual(
        result,
        formData,
        "Should include value when global is missing",
      );
    },
  },
  {
    name: "filterScopeVars-handles-empty-globals",
    description: "Works with empty globals object",
    test: () => {
      const formData = {
        "--color-bg": "#ff0000",
      };
      const result = filterScopeVars(formData, {});
      expectDeepEqual(
        result,
        formData,
        "Should include all values when globals is empty",
      );
    },
  },
  {
    name: "filterScopeVars-cascade-behavior",
    description:
      "After global change, scoped values matching NEW global are excluded",
    test: () => {
      // This tests the cascade behavior:
      // When global changes from #9a9996 to #000000, scoped inputs that were
      // showing the OLD global value get updated to the NEW global value.
      // Then when we filter, they match the new global and are excluded.

      // Simulating: user changed global from #9a9996 to #000000
      // Scoped inputs that were showing #9a9996 are now showing #000000
      const scopedFormData = {
        "--color-bg": "#ffffff", // Different from global - should be included
        "--color-text": "#000000", // Same as NEW global - should be excluded
        "--color-link": "#0066cc", // Same as global - should be excluded
      };
      const newGlobals = {
        "--color-bg": "#ffffff",
        "--color-text": "#000000", // NEW global value
        "--color-link": "#0066cc",
      };
      const result = filterScopeVars(scopedFormData, newGlobals);
      expectDeepEqual(
        result,
        {},
        "After cascade, all scoped values match global and should be excluded",
      );
    },
  },
];

// ============================================
// Unit Tests - generateThemeCss
// ============================================

const generateThemeCssTests = [
  {
    name: "generateThemeCss-global-only",
    description: "Generates CSS with only global values",
    test: () => {
      const globalVars = {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
      };
      const css = generateThemeCss(globalVars, {}, []);
      const expected = `:root {
  --color-bg: #ffffff;
  --color-text: #000000;
}
`;
      expectStrictEqual(css, expected, "Should generate :root only CSS");
    },
  },
  {
    name: "generateThemeCss-with-header-scope",
    description: "Generates CSS with header scope override",
    test: () => {
      const globalVars = { "--color-bg": "#ffffff" };
      const scopeVars = { header: { "--color-text": "#ffffff" } };
      const css = generateThemeCss(globalVars, scopeVars, []);
      const expected = `:root {
  --color-bg: #ffffff;
}

header {
  --color-text: #ffffff;
}
`;
      expectStrictEqual(css, expected, "Should include header scope block");
    },
  },
  {
    name: "generateThemeCss-with-button-scope",
    description: "Generates CSS with multi-line button selector",
    test: () => {
      const globalVars = { "--color-bg": "#ffffff" };
      const scopeVars = { button: { "--color-bg": "#007bff" } };
      const css = generateThemeCss(globalVars, scopeVars, []);
      const expected = `:root {
  --color-bg: #ffffff;
}

button,
.button,
input[type="submit"] {
  --color-bg: #007bff;
}
`;
      expectStrictEqual(css, expected, "Should include button multi-selector");
    },
  },
  {
    name: "generateThemeCss-with-body-classes",
    description: "Generates CSS with body classes comment",
    test: () => {
      const globalVars = { "--color-bg": "#ffffff" };
      const css = generateThemeCss(globalVars, {}, [
        "header-centered-dark",
        "main-boxed",
      ]);
      const expected = `:root {
  --color-bg: #ffffff;
}

/* body_classes: header-centered-dark, main-boxed */`;
      expectStrictEqual(css, expected, "Should include body_classes comment");
    },
  },
  {
    name: "generateThemeCss-omits-empty-scopes",
    description: "Does not include empty scope blocks",
    test: () => {
      const scopeVars = {
        header: { "--color-text": "#fff" },
        nav: {},
        article: {},
      };
      const css = generateThemeCss({}, scopeVars, []);
      expectTrue(css.includes("header {"), "Should include non-empty header");
      expectFalse(css.includes("nav {"), "Should omit empty nav");
      expectFalse(css.includes("article {"), "Should omit empty article");
    },
  },
  {
    name: "generateThemeCss-preserves-scope-order",
    description: "Scopes appear in consistent order",
    test: () => {
      const scopeVars = {
        button: { "--color-bg": "#007bff" },
        header: { "--color-text": "#fff" },
        nav: { "--color-link": "#00ff00" },
      };
      const css = generateThemeCss({}, scopeVars, []);
      const headerPos = css.indexOf("header {");
      const navPos = css.indexOf("nav {");
      const buttonPos = css.indexOf("button,");
      expectTrue(headerPos < navPos, "Header should come before nav");
      expectTrue(navPos < buttonPos, "Nav should come before button");
    },
  },
  {
    name: "generateThemeCss-full-theme",
    description: "Generates complete theme with all sections",
    test: () => {
      const globalVars = {
        "--color-bg": "#241f31",
        "--color-text": "#9a9996",
        "--color-link": "#f6f5f4",
      };
      const scopeVars = {
        header: { "--color-bg": "#3d3846", "--color-text": "#ffffff" },
        nav: { "--color-link": "#ffcc00" },
      };
      const bodyClasses = ["header-centered-dark"];

      const css = generateThemeCss(globalVars, scopeVars, bodyClasses);

      const expected = `:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
  --color-link: #f6f5f4;
}

header {
  --color-bg: #3d3846;
  --color-text: #ffffff;
}

nav {
  --color-link: #ffcc00;
}

/* body_classes: header-centered-dark */`;
      expectStrictEqual(css, expected, "Full theme should match exactly");
    },
  },
];

// ============================================
// Unit Tests - Config validation
// ============================================

const configTests = [
  {
    name: "scopes-match-between-lib-and-config",
    description: "SCOPES constant matches config getScopes()",
    test: () => {
      expectDeepEqual(
        SCOPES,
        ["header", "nav", "article", "form", "button"],
        "SCOPES should contain all expected scope names",
      );
      expectDeepEqual(
        getScopes(),
        SCOPES,
        "getScopes() should return same values as SCOPES constant",
      );
    },
  },
  {
    name: "scope-selectors-header",
    description: "Header selector is correct",
    test: () => {
      expectStrictEqual(
        SCOPE_SELECTORS.header,
        "header",
        "Header selector should be 'header'",
      );
    },
  },
  {
    name: "scope-selectors-nav",
    description: "Nav selector is correct",
    test: () => {
      expectStrictEqual(
        SCOPE_SELECTORS.nav,
        "nav",
        "Nav selector should be 'nav'",
      );
    },
  },
  {
    name: "scope-selectors-article",
    description: "Article selector is correct",
    test: () => {
      expectStrictEqual(
        SCOPE_SELECTORS.article,
        "article",
        "Article selector should be 'article'",
      );
    },
  },
  {
    name: "scope-selectors-form",
    description: "Form selector is correct",
    test: () => {
      expectStrictEqual(
        SCOPE_SELECTORS.form,
        "form",
        "Form selector should be 'form'",
      );
    },
  },
  {
    name: "scope-selectors-button",
    description: "Button selector is multi-line",
    test: () => {
      expectTrue(
        SCOPE_SELECTORS.button.includes("button"),
        "Button selector should include 'button'",
      );
      expectTrue(
        SCOPE_SELECTORS.button.includes(".button"),
        "Button selector should include '.button'",
      );
      expectTrue(
        SCOPE_SELECTORS.button.includes('input[type="submit"]'),
        "Button selector should include input[type='submit']",
      );
    },
  },
  {
    name: "global-inputs-defined",
    description: "GLOBAL_INPUTS has expected color inputs",
    test: () => {
      expectStrictEqual(
        GLOBAL_INPUTS["color-bg"].type,
        "color",
        "color-bg should be color type",
      );
      expectStrictEqual(
        GLOBAL_INPUTS["color-text"].type,
        "color",
        "color-text should be color type",
      );
      expectStrictEqual(
        GLOBAL_INPUTS["color-link"].type,
        "color",
        "color-link should be color type",
      );
    },
  },
  {
    name: "scoped-inputs-defined",
    description: "SCOPED_INPUTS has expected inputs",
    test: () => {
      expectStrictEqual(
        SCOPED_INPUTS["color-bg"].type,
        "color",
        "scoped color-bg should be color type",
      );
      expectStrictEqual(
        SCOPED_INPUTS.border.type,
        "border",
        "scoped border should be border type",
      );
    },
  },
  {
    name: "scoped-var-names-correct",
    description: "getScopedVarNames returns CSS variable names",
    test: () => {
      const varNames = getScopedVarNames();
      expectTrue(varNames.includes("--color-bg"), "Should include --color-bg");
      expectTrue(
        varNames.includes("--color-text"),
        "Should include --color-text",
      );
      expectTrue(varNames.includes("--border"), "Should include --border");
    },
  },
  {
    name: "input-counts-consistent",
    description: "getInputCounts returns consistent values",
    test: () => {
      const counts = getInputCounts();
      expectStrictEqual(counts.scopes, 5, "Should have 5 scopes");
      expectTrue(counts.global > 0, "Should have global inputs");
      expectTrue(counts.scopedPerScope > 0, "Should have scoped inputs");
      expectStrictEqual(
        counts.totalScoped,
        counts.scopedPerScope * counts.scopes,
        "totalScoped should equal scopedPerScope * scopes",
      );
    },
  },
];

// ============================================
// Round-trip tests
// ============================================

const roundTripTests = [
  {
    name: "roundtrip-parse-generate-simple",
    description: "Parsing and regenerating preserves simple theme",
    test: () => {
      const originalTheme = `:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
}

header {
  --color-text: #ffffff;
}

/* body_classes: header-centered-dark */`;

      const parsed = parseThemeContent(originalTheme);
      const generated = generateThemeCss(
        parsed.root,
        parsed.scopes,
        parsed.bodyClasses,
      );
      const reparsed = parseThemeContent(generated);

      expectDeepEqual(
        reparsed.root,
        parsed.root,
        "Round-trip should preserve :root variables",
      );
      expectDeepEqual(
        reparsed.scopes,
        parsed.scopes,
        "Round-trip should preserve scope variables",
      );
      expectDeepEqual(
        reparsed.bodyClasses,
        parsed.bodyClasses,
        "Round-trip should preserve body classes",
      );
    },
  },
  {
    name: "roundtrip-parse-generate-complex",
    description: "Parsing and regenerating preserves complex theme",
    test: () => {
      const originalTheme = `:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
  --color-link: #f6f5f4;
  --color-link-hover: #ffffff;
}

header {
  --color-bg: #3d3846;
  --color-text: #ffffff;
}

nav {
  --color-bg: #1a1a1a;
  --color-link: #ffcc00;
}

button,
.button,
input[type="submit"] {
  --color-bg: #62a0ea;
  --color-text: #000000;
}

/* body_classes: header-centered-dark */`;

      const parsed = parseThemeContent(originalTheme);
      const generated = generateThemeCss(
        parsed.root,
        parsed.scopes,
        parsed.bodyClasses,
      );
      const reparsed = parseThemeContent(generated);

      expectDeepEqual(
        reparsed.root,
        parsed.root,
        "Complex round-trip should preserve :root",
      );
      expectDeepEqual(
        reparsed.scopes.header,
        parsed.scopes.header,
        "Complex round-trip should preserve header",
      );
      expectDeepEqual(
        reparsed.scopes.nav,
        parsed.scopes.nav,
        "Complex round-trip should preserve nav",
      );
      expectDeepEqual(
        reparsed.scopes.button,
        parsed.scopes.button,
        "Complex round-trip should preserve button",
      );
    },
  },
  {
    name: "roundtrip-adding-scopes",
    description: "Can add new scopes to a minimal theme",
    test: () => {
      const minimalTheme = `:root { --color-bg: #ffffff; }`;
      const parsed = parseThemeContent(minimalTheme);

      const newScopeVars = {
        header: { "--color-text": "#ffffff" },
        nav: { "--color-bg": "#333333" },
      };

      const generated = generateThemeCss(parsed.root, newScopeVars, []);
      const reparsed = parseThemeContent(generated);

      expectDeepEqual(
        reparsed.scopes.header,
        newScopeVars.header,
        "Should add header scope",
      );
      expectDeepEqual(
        reparsed.scopes.nav,
        newScopeVars.nav,
        "Should add nav scope",
      );
    },
  },
  {
    name: "roundtrip-removing-scopes",
    description: "Can remove scopes by passing empty scopeVars",
    test: () => {
      const themeWithScopes = `:root { --color-bg: #ffffff; }

header {
  --color-text: #ffffff;
}`;
      const parsed = parseThemeContent(themeWithScopes);
      expectDeepEqual(
        parsed.scopes.header,
        { "--color-text": "#ffffff" },
        "Should parse existing header scope",
      );

      // Generate without any scopes
      const generated = generateThemeCss(parsed.root, {}, []);
      const reparsed = parseThemeContent(generated);

      expectDeepEqual(
        reparsed.scopes,
        {},
        "Should have no scopes after regenerating with empty scopeVars",
      );
    },
  },
];

// ============================================
// Integration tests - filterScopeVars workflow
// ============================================

const integrationTests = [
  {
    name: "integration-collect-and-generate",
    description: "filterScopeVars + generateThemeCss produces correct output",
    test: () => {
      const globalVars = {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
        "--color-link": "#0066cc",
      };

      // Simulate form data for each scope
      const headerFormData = {
        "--color-bg": "#ff0000", // Different
        "--color-text": "#000000", // Same as global
        "--color-link": "#0066cc", // Same as global
      };
      const navFormData = {
        "--color-bg": "#ffffff", // Same as global
        "--color-text": "#000000", // Same as global
        "--color-link": "#00ff00", // Different
      };

      // Filter to get only overrides
      const headerVars = filterScopeVars(headerFormData, globalVars);
      const navVars = filterScopeVars(navFormData, globalVars);

      expectDeepEqual(
        headerVars,
        { "--color-bg": "#ff0000" },
        "Header should only have bg override",
      );
      expectDeepEqual(
        navVars,
        { "--color-link": "#00ff00" },
        "Nav should only have link override",
      );

      // Generate CSS
      const scopeVars = {};
      if (Object.keys(headerVars).length > 0) scopeVars.header = headerVars;
      if (Object.keys(navVars).length > 0) scopeVars.nav = navVars;

      const css = generateThemeCss(globalVars, scopeVars, []);

      expectTrue(css.includes("header {"), "Should include header block");
      expectTrue(
        css.includes("--color-bg: #ff0000"),
        "Should include header bg",
      );
      expectTrue(css.includes("nav {"), "Should include nav block");
      expectTrue(
        css.includes("--color-link: #00ff00"),
        "Should include nav link",
      );
      expectFalse(css.includes("article {"), "Should not include article");
    },
  },
  {
    name: "integration-no-overrides-minimal-output",
    description: "When all scoped values match global, output is minimal",
    test: () => {
      const globalVars = {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
      };

      // All scopes have values matching global
      const headerFormData = {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
      };

      const headerVars = filterScopeVars(headerFormData, globalVars);
      expectDeepEqual(headerVars, {}, "Header should have no overrides");

      const scopeVars = {};
      if (Object.keys(headerVars).length > 0) scopeVars.header = headerVars;

      const css = generateThemeCss(globalVars, scopeVars, []);

      expectFalse(css.includes("header {"), "Should not include header block");
      expectTrue(css.includes(":root {"), "Should include :root block");
    },
  },
  {
    name: "integration-border-handling",
    description: "Border values are correctly filtered and generated",
    test: () => {
      const globalVars = {
        "--border": "2px solid #000000",
      };

      // Header has different border
      const headerFormData = {
        "--border": "3px solid #ff0000",
      };
      // Nav has same border as global
      const navFormData = {
        "--border": "2px solid #000000",
      };

      const headerVars = filterScopeVars(headerFormData, globalVars);
      const navVars = filterScopeVars(navFormData, globalVars);

      expectDeepEqual(
        headerVars,
        { "--border": "3px solid #ff0000" },
        "Header should have border override",
      );
      expectDeepEqual(navVars, {}, "Nav should have no overrides");

      const scopeVars = { header: headerVars };
      const css = generateThemeCss(globalVars, scopeVars, []);

      expectTrue(css.includes("header {"), "Should include header block");
      expectTrue(
        css.includes("--border: 3px solid #ff0000"),
        "Should include header border",
      );
    },
  },
];

// ============================================
// Combine and run all tests
// ============================================

const allTestCases = [
  ...parseCssBlockTests,
  ...parseThemeContentTests,
  ...parseBorderValueTests,
  ...shouldIncludeScopedVarTests,
  ...filterScopeVarsTests,
  ...generateThemeCssTests,
  ...configTests,
  ...roundTripTests,
  ...integrationTests,
];

createTestRunner("theme-editor", allTestCases);
