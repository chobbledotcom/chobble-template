import { describe, expect, test } from "bun:test";
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

// ============================================
// Unit Tests - parseCssBlock
// ============================================

describe("theme-editor", () => {
  test("Parses CSS variables from block content", () => {
    const css = `
        --color-bg: #ffffff;
        --color-text: #000000;
        --border: 2px solid #333;
      `;
    const result = parseCssBlock(css);
    expect(result).toEqual({
      "--color-bg": "#ffffff",
      "--color-text": "#000000",
      "--border": "2px solid #333",
    });
  });

  test("Ignores regular CSS properties", () => {
    const css = `
        --color-bg: #fff;
        background: red;
        --color-text: #000;
      `;
    const result = parseCssBlock(css);
    expect(result).toEqual({
      "--color-bg": "#fff",
      "--color-text": "#000",
    });
  });

  test("Returns empty object for empty/null input", () => {
    expect(parseCssBlock("")).toEqual({});
    expect(parseCssBlock(null)).toEqual({});
    expect(parseCssBlock(undefined)).toEqual({});
  });

  test("Handles various whitespace in CSS", () => {
    const css = "--color-bg:#fff;--color-text:  #000  ;";
    const result = parseCssBlock(css);
    expect(result).toEqual({
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
    const theme = `
:root { --color-bg: #fff; }
header { --color-text: #ffffff; --color-bg: #333; }
      `;
    const result = parseThemeContent(theme);
    expect(result.scopes.header).toEqual({
      "--color-text": "#ffffff",
      "--color-bg": "#333",
    });
  });

  test("Parses nav scope variables", () => {
    const theme = `
:root { --color-bg: #fff; }
nav { --color-link: #00ff00; }
      `;
    const result = parseThemeContent(theme);
    expect(result.scopes.nav).toEqual({ "--color-link": "#00ff00" });
  });

  test("Parses article scope variables", () => {
    const theme = `
:root { --color-bg: #fff; }
article { --color-bg: #f0f0f0; }
      `;
    const result = parseThemeContent(theme);
    expect(result.scopes.article).toEqual({ "--color-bg": "#f0f0f0" });
  });

  test("Parses form scope variables", () => {
    const theme = `
:root { --color-bg: #fff; }
form { --border: 1px solid #ccc; }
      `;
    const result = parseThemeContent(theme);
    expect(result.scopes.form).toEqual({ "--border": "1px solid #ccc" });
  });

  test("Parses button multi-selector scope variables", () => {
    const theme = `
:root { --color-bg: #fff; }
button,
.button,
input[type="submit"] {
  --color-bg: #007bff;
}
      `;
    const result = parseThemeContent(theme);
    expect(result.scopes.button).toEqual({ "--color-bg": "#007bff" });
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
    expect(shouldIncludeScopedVar("#ff0000", "#ffffff")).toBe(true);
    expect(shouldIncludeScopedVar("#000000", "#ffffff")).toBe(true);
    expect(shouldIncludeScopedVar("3px solid #000", "2px solid #000")).toBe(
      true,
    );
  });

  test("Returns false when scoped value equals global", () => {
    expect(shouldIncludeScopedVar("#ffffff", "#ffffff")).toBe(false);
    expect(shouldIncludeScopedVar("2px solid #333", "2px solid #333")).toBe(
      false,
    );
  });

  test("Returns false for empty/null values", () => {
    expect(shouldIncludeScopedVar("", "#ffffff")).toBe(false);
    expect(shouldIncludeScopedVar(null, "#ffffff")).toBe(false);
    expect(shouldIncludeScopedVar(undefined, "#ffffff")).toBe(false);
  });

  test("Black (#000000) is included when it differs from global", () => {
    // This tests the bug fix: black should be preserved when intentionally set
    expect(shouldIncludeScopedVar("#000000", "#ffffff")).toBe(true);
    expect(shouldIncludeScopedVar("#000000", "#333333")).toBe(true);
    // But excluded when global is also black
    expect(shouldIncludeScopedVar("#000000", "#000000")).toBe(false);
  });

  // ============================================
  // Unit Tests - filterScopeVars
  // ============================================

  test("Only includes values that differ from global", () => {
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
    expect(result).toEqual({
      "--color-bg": "#ff0000",
      "--color-link": "#0000ff",
    });
  });

  test("Returns empty object when all values match global", () => {
    const formData = {
      "--color-bg": "#ffffff",
      "--color-text": "#000000",
    };
    const globals = {
      "--color-bg": "#ffffff",
      "--color-text": "#000000",
    };
    const result = filterScopeVars(formData, globals);
    expect(result).toEqual({});
  });

  test("Returns all values when none match global", () => {
    const formData = {
      "--color-bg": "#ff0000",
      "--color-text": "#00ff00",
    };
    const globals = {
      "--color-bg": "#ffffff",
      "--color-text": "#000000",
    };
    const result = filterScopeVars(formData, globals);
    expect(result).toEqual(formData);
  });

  test("Includes values when global is missing", () => {
    const formData = {
      "--color-bg": "#ff0000",
      "--color-text": "#00ff00",
    };
    const globals = {
      "--color-bg": "#ffffff",
      // --color-text missing
    };
    const result = filterScopeVars(formData, globals);
    expect(result).toEqual(formData);
  });

  test("Works with empty globals object", () => {
    const formData = {
      "--color-bg": "#ff0000",
    };
    const result = filterScopeVars(formData, {});
    expect(result).toEqual(formData);
  });

  test("After global change, scoped values matching NEW global are excluded", () => {
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
    expect(result).toEqual({});
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
  // Unit Tests - Config validation
  // ============================================

  test("SCOPES constant matches config getScopes()", () => {
    expect(SCOPES).toEqual(["header", "nav", "article", "form", "button"]);
    expect(getScopes()).toEqual(SCOPES);
  });

  test("Header selector is correct", () => {
    expect(SCOPE_SELECTORS.header).toBe("header");
  });

  test("Nav selector is correct", () => {
    expect(SCOPE_SELECTORS.nav).toBe("nav");
  });

  test("Article selector is correct", () => {
    expect(SCOPE_SELECTORS.article).toBe("article");
  });

  test("Form selector is correct", () => {
    expect(SCOPE_SELECTORS.form).toBe("form");
  });

  test("Button selector is multi-line", () => {
    expect(SCOPE_SELECTORS.button.includes("button")).toBe(true);
    expect(SCOPE_SELECTORS.button.includes(".button")).toBe(true);
    expect(SCOPE_SELECTORS.button.includes('input[type="submit"]')).toBe(true);
  });

  test("GLOBAL_INPUTS has expected color inputs", () => {
    expect(GLOBAL_INPUTS["color-bg"].type).toBe("color");
    expect(GLOBAL_INPUTS["color-text"].type).toBe("color");
    expect(GLOBAL_INPUTS["color-link"].type).toBe("color");
  });

  test("SCOPED_INPUTS has expected inputs", () => {
    expect(SCOPED_INPUTS["color-bg"].type).toBe("color");
    expect(SCOPED_INPUTS.border.type).toBe("border");
  });

  test("getScopedVarNames returns CSS variable names", () => {
    const varNames = getScopedVarNames();
    expect(varNames.includes("--color-bg")).toBe(true);
    expect(varNames.includes("--color-text")).toBe(true);
    expect(varNames.includes("--border")).toBe(true);
  });

  test("getInputCounts returns consistent values", () => {
    const counts = getInputCounts();
    expect(counts.scopes).toBe(5);
    expect(counts.global > 0).toBe(true);
    expect(counts.scopedPerScope > 0).toBe(true);
    expect(counts.totalScoped).toBe(counts.scopedPerScope * counts.scopes);
  });

  // ============================================
  // Round-trip tests
  // ============================================

  test("Parsing and regenerating preserves simple theme", () => {
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

    expect(reparsed.root).toEqual(parsed.root);
    expect(reparsed.scopes).toEqual(parsed.scopes);
    expect(reparsed.bodyClasses).toEqual(parsed.bodyClasses);
  });

  test("Parsing and regenerating preserves complex theme", () => {
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
  // Integration tests - filterScopeVars workflow
  // ============================================

  test("filterScopeVars + generateThemeCss produces correct output", () => {
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

    expect(headerVars).toEqual({ "--color-bg": "#ff0000" });
    expect(navVars).toEqual({ "--color-link": "#00ff00" });

    // Generate CSS
    const scopeVars = {};
    if (Object.keys(headerVars).length > 0) scopeVars.header = headerVars;
    if (Object.keys(navVars).length > 0) scopeVars.nav = navVars;

    const css = generateThemeCss(globalVars, scopeVars, []);

    expect(css.includes("header {")).toBe(true);
    expect(css.includes("--color-bg: #ff0000")).toBe(true);
    expect(css.includes("nav {")).toBe(true);
    expect(css.includes("--color-link: #00ff00")).toBe(true);
    expect(css.includes("article {")).toBe(false);
  });

  test("When all scoped values match global, output is minimal", () => {
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
    expect(headerVars).toEqual({});

    const scopeVars = {};
    if (Object.keys(headerVars).length > 0) scopeVars.header = headerVars;

    const css = generateThemeCss(globalVars, scopeVars, []);

    expect(css.includes("header {")).toBe(false);
    expect(css.includes(":root {")).toBe(true);
  });

  test("Border values are correctly filtered and generated", () => {
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

    expect(headerVars).toEqual({ "--border": "3px solid #ff0000" });
    expect(navVars).toEqual({});

    const scopeVars = { header: headerVars };
    const css = generateThemeCss(globalVars, scopeVars, []);

    expect(css.includes("header {")).toBe(true);
    expect(css.includes("--border: 3px solid #ff0000")).toBe(true);
  });
});
