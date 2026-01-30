import { describe, expect, test } from "bun:test";
import {
  collectActiveClasses,
  controlToVarEntry,
  createFormEl,
  generateThemeCss,
  inputToScopedEntry,
  isControlEnabled,
  parseBorderValue,
  parseThemeContent,
  shouldIncludeScopedVar,
} from "#public/theme/theme-editor-lib.js";

// ============================================
// Functional Test Helpers
// ============================================

/**
 * Parse-generate-reparse a theme and return both results for comparison.
 * Curried: takes theme string, returns { parsed, reparsed } for assertions.
 */
const roundTripTheme = (theme) => {
  const parsed = parseThemeContent(theme);
  const generated = generateThemeCss(
    parsed.root,
    parsed.scopes,
    parsed.bodyClasses,
  );
  return { parsed, reparsed: parseThemeContent(generated) };
};

/**
 * Create a scoped entry test runner.
 * Curried: (varName, globalValue) => (inputValue) => result
 */
const testScopedEntry = (varName, globalValue) => (inputValue) => {
  document.documentElement.style.setProperty(varName, globalValue);
  const input = document.createElement("input");
  input.dataset.var = varName;
  input.value = inputValue;
  return inputToScopedEntry(getComputedStyle(document.documentElement))(input);
};

/**
 * Curried: parse a theme with :root + scope declaration, return the parsed scope.
 * (scopeBlock) => (scopeName) => parsed scope vars
 */
const parsedScope = (scopeBlock) => (scopeName) =>
  parseThemeContent(`:root { --color-bg: #fff; }\n${scopeBlock}`).scopes[
    scopeName
  ];

/**
 * Curried: assert shouldIncludeScopedVar returns expected result.
 * (expected) => (scopedValue, globalValue) => void
 */
const expectIncluded = (scopedValue, globalValue) =>
  expect(shouldIncludeScopedVar(scopedValue, globalValue)).toBe(true);

const expectExcluded = (scopedValue, globalValue) =>
  expect(shouldIncludeScopedVar(scopedValue, globalValue)).toBe(false);

/**
 * Set up a form in the DOM and return the formEl helper.
 * Curried: (formId, html) => formEl function
 */
const setupForm = (formId, html) => {
  document.body.innerHTML = `<form id="${formId}">${html}</form>`;
  return createFormEl(formId);
};

// ============================================
// Unit Tests - parseThemeContent (CSS parsing)
// ============================================

describe("theme-editor", () => {
  test("Parses CSS variables from :root block", () => {
    const theme = `:root {
  --color-bg: #ffffff;
  --color-text: #000000;
  --border: 2px solid #333;
}`;
    const result = parseThemeContent(theme);
    expect(result.root).toEqual({
      "--color-bg": "#ffffff",
      "--color-text": "#000000",
      "--border": "2px solid #333",
    });
  });

  test("Ignores regular CSS properties when parsing", () => {
    const theme = `:root {
  --color-bg: #fff;
  background: red;
  --color-text: #000;
}`;
    const result = parseThemeContent(theme);
    expect(result.root).toEqual({
      "--color-bg": "#fff",
      "--color-text": "#000",
    });
  });

  test("Returns empty object for empty theme", () => {
    const result = parseThemeContent("");
    expect(result.root).toEqual({});
    expect(result.scopes).toEqual({});
  });

  test("Handles various whitespace in CSS variables", () => {
    const theme = ":root { --color-bg:#fff;--color-text:  #000  ; }";
    const result = parseThemeContent(theme);
    expect(result.root).toEqual({
      "--color-bg": "#fff",
      "--color-text": "#000",
    });
  });

  // ============================================
  // Unit Tests - parseThemeContent
  // ============================================

  test("Parses :root variables", () => {
    const theme = `
:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
}
      `;
    const result = parseThemeContent(theme);
    expect(result.root).toEqual({
      "--color-bg": "#241f31",
      "--color-text": "#9a9996",
    });
  });

  test("Parses header scope variables", () => {
    expect(
      parsedScope("header { --color-text: #ffffff; --color-bg: #333; }")(
        "header",
      ),
    ).toEqual({ "--color-text": "#ffffff", "--color-bg": "#333" });
  });

  test("Parses nav scope variables", () => {
    expect(parsedScope("nav { --color-link: #00ff00; }")("nav")).toEqual({
      "--color-link": "#00ff00",
    });
  });

  test("Parses article scope variables", () => {
    expect(parsedScope("article { --color-bg: #f0f0f0; }")("article")).toEqual({
      "--color-bg": "#f0f0f0",
    });
  });

  test("Parses form scope variables", () => {
    expect(parsedScope("form { --border: 1px solid #ccc; }")("form")).toEqual({
      "--border": "1px solid #ccc",
    });
  });

  test("Parses button multi-selector scope variables", () => {
    expect(
      parsedScope(
        'button,\n.button,\ninput[type="submit"] {\n  --color-bg: #007bff;\n}',
      )("button"),
    ).toEqual({ "--color-bg": "#007bff" });
  });

  test("Parses body_classes comment", () => {
    const theme = `
:root { --color-bg: #fff; }
/* body_classes: header-centered-dark, main-boxed */
      `;
    const result = parseThemeContent(theme);
    expect(result.bodyClasses).toEqual(["header-centered-dark", "main-boxed"]);
  });

  test("Returns empty structure for empty input", () => {
    const result = parseThemeContent("");
    expect(result.root).toEqual({});
    expect(result.scopes).toEqual({});
    expect(result.bodyClasses).toEqual([]);
  });

  // ============================================
  // Unit Tests - parseBorderValue
  // ============================================

  test("Parses solid border value into components", () => {
    expect(parseBorderValue("2px solid #000000")).toEqual({
      width: 2,
      style: "solid",
      color: "#000000",
    });
  });

  test("Parses dashed border value into components", () => {
    expect(parseBorderValue("3px dashed #ff0000")).toEqual({
      width: 3,
      style: "dashed",
      color: "#ff0000",
    });
  });

  test("Parses dotted border value into components", () => {
    expect(parseBorderValue("1px dotted #333333")).toEqual({
      width: 1,
      style: "dotted",
      color: "#333333",
    });
  });

  test("Returns null for invalid border values", () => {
    expect(parseBorderValue("")).toBe(null);
    expect(parseBorderValue(null)).toBe(null);
    expect(parseBorderValue("invalid")).toBe(null);
  });

  // ============================================
  // Unit Tests - shouldIncludeScopedVar
  // ============================================

  test("Returns true when scoped value differs from global", () => {
    expectIncluded("#ff0000", "#ffffff");
    expectIncluded("#000000", "#ffffff");
    expectIncluded("3px solid #000", "2px solid #000");
  });

  test("Returns false when scoped value equals global", () => {
    expectExcluded("#ffffff", "#ffffff");
    expectExcluded("2px solid #333", "2px solid #333");
  });

  test("Returns false for empty/null values", () => {
    expectExcluded("", "#ffffff");
    expectExcluded(null, "#ffffff");
    expectExcluded(undefined, "#ffffff");
  });

  test("Black (#000000) is included when it differs from global", () => {
    // This tests the bug fix: black should be preserved when intentionally set
    expectIncluded("#000000", "#ffffff");
    expectIncluded("#000000", "#333333");
    // But excluded when global is also black
    expectExcluded("#000000", "#000000");
  });

  // ============================================
  // Unit Tests - Scope filtering via shouldIncludeScopedVar
  // ============================================

  test("Scope filtering only includes values that differ from global", () => {
    expectIncluded("#ff0000", "#ffffff");
    expectExcluded("#ffffff", "#ffffff");
    expectIncluded("#0000ff", "#000000");
  });

  test("Scope filtering returns false when values match global", () => {
    expectExcluded("#ffffff", "#ffffff");
    expectExcluded("#000000", "#000000");
    expectExcluded("2px solid #333", "2px solid #333");
  });

  test("Scope filtering includes all values when none match global", () => {
    expectIncluded("#ff0000", "#ffffff");
    expectIncluded("#00ff00", "#000000");
  });

  test("Scope filtering includes values when global is undefined", () => {
    expectIncluded("#ff0000", undefined);
  });

  test("Scope filtering excludes empty values regardless of global", () => {
    expectExcluded("", "#ffffff");
    expectExcluded(null, "#ffffff");
  });

  // ============================================
  // Unit Tests - generateThemeCss
  // ============================================

  test("Generates CSS with only global values", () => {
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
    expect(css).toBe(expected);
  });

  test("Generates CSS with header scope override", () => {
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
    expect(css).toBe(expected);
  });

  test("Generates CSS with multi-line button selector", () => {
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
    expect(css).toBe(expected);
  });

  test("Generates CSS with body classes comment", () => {
    const globalVars = { "--color-bg": "#ffffff" };
    const css = generateThemeCss(globalVars, {}, [
      "header-centered-dark",
      "main-boxed",
    ]);
    const expected = `:root {
  --color-bg: #ffffff;
}

/* body_classes: header-centered-dark, main-boxed */`;
    expect(css).toBe(expected);
  });

  test("Does not include empty scope blocks", () => {
    const scopeVars = {
      header: { "--color-text": "#fff" },
      nav: {},
      article: {},
    };
    const css = generateThemeCss({}, scopeVars, []);
    expect(css.includes("header {")).toBe(true);
    expect(css.includes("nav {")).toBe(false);
    expect(css.includes("article {")).toBe(false);
  });

  test("Scopes appear in consistent order", () => {
    const scopeVars = {
      button: { "--color-bg": "#007bff" },
      header: { "--color-text": "#fff" },
      nav: { "--color-link": "#00ff00" },
    };
    const css = generateThemeCss({}, scopeVars, []);
    const headerPos = css.indexOf("header {");
    const navPos = css.indexOf("nav {");
    const buttonPos = css.indexOf("button,");
    expect(headerPos < navPos).toBe(true);
    expect(navPos < buttonPos).toBe(true);
  });

  test("Generates complete theme with all sections", () => {
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
    expect(css).toBe(expected);
  });

  // ============================================
  // Round-trip tests
  // ============================================

  test("Parsing and regenerating preserves simple theme", () => {
    const { parsed, reparsed } = roundTripTheme(`:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
}

header {
  --color-text: #ffffff;
}

/* body_classes: header-centered-dark */`);

    expect(reparsed.root).toEqual(parsed.root);
    expect(reparsed.scopes).toEqual(parsed.scopes);
    expect(reparsed.bodyClasses).toEqual(parsed.bodyClasses);
  });

  test("Parsing and regenerating preserves complex theme", () => {
    const { parsed, reparsed } = roundTripTheme(`:root {
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

/* body_classes: header-centered-dark */`);

    expect(reparsed.root).toEqual(parsed.root);
    expect(reparsed.scopes.header).toEqual(parsed.scopes.header);
    expect(reparsed.scopes.nav).toEqual(parsed.scopes.nav);
    expect(reparsed.scopes.button).toEqual(parsed.scopes.button);
  });

  test("Can add new scopes to a minimal theme", () => {
    const minimalTheme = ":root { --color-bg: #ffffff; }";
    const parsed = parseThemeContent(minimalTheme);

    const newScopeVars = {
      header: { "--color-text": "#ffffff" },
      nav: { "--color-bg": "#333333" },
    };

    const generated = generateThemeCss(parsed.root, newScopeVars, []);
    const reparsed = parseThemeContent(generated);

    expect(reparsed.scopes.header).toEqual(newScopeVars.header);
    expect(reparsed.scopes.nav).toEqual(newScopeVars.nav);
  });

  test("Can remove scopes by passing empty scopeVars", () => {
    const themeWithScopes = `:root { --color-bg: #ffffff; }

header {
  --color-text: #ffffff;
}`;
    const parsed = parseThemeContent(themeWithScopes);
    expect(parsed.scopes.header).toEqual({ "--color-text": "#ffffff" });

    // Generate without any scopes
    const generated = generateThemeCss(parsed.root, {}, []);
    const reparsed = parseThemeContent(generated);

    expect(reparsed.scopes).toEqual({});
  });

  // ============================================
  // Integration tests - generateThemeCss with scoped overrides
  // ============================================

  test("generateThemeCss includes only overridden scope variables", () => {
    const globalVars = {
      "--color-bg": "#ffffff",
      "--color-text": "#000000",
      "--color-link": "#0066cc",
    };

    // Header only overrides color-bg
    const scopeVars = {
      header: { "--color-bg": "#ff0000" },
      nav: { "--color-link": "#00ff00" },
    };

    const css = generateThemeCss(globalVars, scopeVars, []);

    expect(css.includes("header {")).toBe(true);
    expect(css.includes("--color-bg: #ff0000")).toBe(true);
    expect(css.includes("nav {")).toBe(true);
    expect(css.includes("--color-link: #00ff00")).toBe(true);
    expect(css.includes("article {")).toBe(false);
  });

  test("generateThemeCss outputs minimal CSS when no scopes are overridden", () => {
    const globalVars = {
      "--color-bg": "#ffffff",
      "--color-text": "#000000",
    };

    const css = generateThemeCss(globalVars, {}, []);

    expect(css.includes("header {")).toBe(false);
    expect(css.includes(":root {")).toBe(true);
  });

  test("generateThemeCss handles border value overrides", () => {
    const globalVars = {
      "--border": "2px solid #000000",
    };

    // Only header overrides border
    const scopeVars = {
      header: { "--border": "3px solid #ff0000" },
    };

    const css = generateThemeCss(globalVars, scopeVars, []);

    expect(css.includes("header {")).toBe(true);
    expect(css.includes("--border: 3px solid #ff0000")).toBe(true);
  });

  // ============================================
  // Unit Tests - DOM Functions (with mocking)
  // ============================================

  test("createFormEl returns function that queries form elements", () => {
    const formEl = setupForm(
      "theme-form",
      `
      <input id="color-bg" type="color" value="#ffffff">
      <input id="color-text" type="color" value="#000000">
    `,
    );
    expect(formEl("color-bg")?.id).toBe("color-bg");
    expect(formEl("color-text")?.id).toBe("color-text");
    expect(formEl("non-existent")).toBe(null);
  });

  test("isControlEnabled returns true when no checkbox exists", () => {
    const formEl = setupForm(
      "test-form",
      `
      <input id="color-bg" type="color" value="#ffffff">
    `,
    );
    expect(isControlEnabled(formEl)(formEl("color-bg"))).toBe(true);
  });

  test("isControlEnabled returns checkbox state when checkbox exists", () => {
    const formEl = setupForm(
      "test-form",
      `
      <input id="color-bg" type="color" value="#ffffff">
      <input id="color-bg-enabled" type="checkbox" checked>
      <input id="color-text" type="color" value="#000000">
      <input id="color-text-enabled" type="checkbox">
    `,
    );
    expect(isControlEnabled(formEl)(formEl("color-bg"))).toBe(true);
    expect(isControlEnabled(formEl)(formEl("color-text"))).toBe(false);
  });

  test("controlToVarEntry converts input to CSS variable entry", () => {
    const input = document.createElement("input");
    input.id = "color-bg";
    input.value = "#ff0000";

    const result = controlToVarEntry(input);

    expect(result).toEqual(["--color-bg", "#ff0000"]);
    expect(document.documentElement.style.getPropertyValue("--color-bg")).toBe(
      "#ff0000",
    );
  });

  test("controlToVarEntry appends px for border-radius", () => {
    const input = document.createElement("input");
    input.id = "border-radius";
    input.value = "8";

    const result = controlToVarEntry(input);

    expect(result).toEqual(["--border-radius", "8px"]);
  });

  test("inputToScopedEntry returns entry when value differs from global", () => {
    const testColorBg = testScopedEntry("--color-bg", "#ffffff");

    expect(testColorBg("#ff0000")).toEqual(["--color-bg", "#ff0000"]);
  });

  test("inputToScopedEntry returns null when value matches global", () => {
    const testColorBg = testScopedEntry("--color-bg", "#ffffff");

    expect(testColorBg("#ffffff")).toBe(null);
  });

  test("collectActiveClasses toggles body classes based on selection", () => {
    const formEl = setupForm(
      "test-form",
      `
      <select id="header-style">
        <option value="">None</option>
        <option value="header-dark">Dark Header</option>
        <option value="header-light">Light Header</option>
      </select>
    `,
    );
    formEl("header-style").value = "header-dark";
    expect(collectActiveClasses(formEl)(formEl("header-style"))).toEqual([
      "header-dark",
    ]);
    expect(document.body.classList.contains("header-dark")).toBe(true);
  });

  test("collectActiveClasses returns empty when checkbox control is disabled", () => {
    const formEl = setupForm(
      "test-form",
      `
      <select id="header-style"><option value="header-dark">Dark</option></select>
      <input id="header-style-enabled" type="checkbox">
    `,
    );
    formEl("header-style").value = "header-dark";
    expect(collectActiveClasses(formEl)(formEl("header-style"))).toEqual([]);
    expect(document.body.classList.contains("header-dark")).toBe(false);
  });

  test("collectActiveClasses returns empty array when no option selected", () => {
    const formEl = setupForm(
      "test-form",
      `
      <select id="header-style">
        <option value="" selected>None</option>
        <option value="header-dark">Dark</option>
      </select>
    `,
    );
    expect(collectActiveClasses(formEl)(formEl("header-style"))).toEqual([]);
  });
});
