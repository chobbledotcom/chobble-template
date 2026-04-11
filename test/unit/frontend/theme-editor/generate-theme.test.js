// Tests for generateThemeCss, shouldIncludeScopedVar, and round-trip
// parsing. These functions drive the SCSS output persisted by the theme
// editor; they are pure and do not touch the DOM.

import { describe, expect, test } from "bun:test";
import {
  generateThemeCss,
  parseThemeContent,
  shouldIncludeScopedVar,
} from "#public/theme/theme-editor-lib.js";

// Parse-generate-reparse a theme so tests can assert that round-tripping
// a theme preserves all structured data without coupling to exact whitespace.
const roundTripTheme = (theme) => {
  const parsed = parseThemeContent(theme);
  const generated = generateThemeCss(
    parsed.root,
    parsed.scopes,
    parsed.bodyClasses,
  );
  return { parsed, reparsed: parseThemeContent(generated) };
};

describe("shouldIncludeScopedVar", () => {
  test("includes value that differs from global", () => {
    expect(shouldIncludeScopedVar("#ff0000", "#ffffff")).toBe(true);
  });

  test("includes black override of white global", () => {
    // Regression: ensure intentional #000000 is not treated as falsy.
    expect(shouldIncludeScopedVar("#000000", "#ffffff")).toBe(true);
  });

  test("excludes value equal to global", () => {
    expect(shouldIncludeScopedVar("#ffffff", "#ffffff")).toBe(false);
  });

  test("excludes empty string regardless of global", () => {
    expect(shouldIncludeScopedVar("", "#ffffff")).toBe(false);
  });

  test("excludes null regardless of global", () => {
    expect(shouldIncludeScopedVar(null, "#ffffff")).toBe(false);
  });

  test("excludes undefined regardless of global", () => {
    expect(shouldIncludeScopedVar(undefined, "#ffffff")).toBe(false);
  });

  test("includes value when global is undefined", () => {
    expect(shouldIncludeScopedVar("#ff0000", undefined)).toBe(true);
  });

  test("includes differing border-style values", () => {
    expect(shouldIncludeScopedVar("3px solid #000", "2px solid #000")).toBe(
      true,
    );
  });

  test("excludes matching border-style values", () => {
    expect(shouldIncludeScopedVar("2px solid #333", "2px solid #333")).toBe(
      false,
    );
  });
});

describe("generateThemeCss", () => {
  test("emits :root block with only global values", () => {
    const css = generateThemeCss(
      { "--color-bg": "#ffffff", "--color-text": "#000000" },
      {},
      [],
    );
    // Reparse rather than assert exact whitespace; parseThemeContent is the
    // consumer so round-trip equality is what we care about.
    expect(parseThemeContent(css).root).toEqual({
      "--color-bg": "#ffffff",
      "--color-text": "#000000",
    });
    expect(css.includes("header {")).toBe(false);
  });

  test("emits header scope block when header overrides exist", () => {
    const css = generateThemeCss(
      { "--color-bg": "#ffffff" },
      { header: { "--color-text": "#ffffff" } },
      [],
    );
    const { scopes } = parseThemeContent(css);
    expect(scopes.header).toEqual({ "--color-text": "#ffffff" });
  });

  test("uses multi-selector form for button scope", () => {
    const css = generateThemeCss(
      { "--color-bg": "#ffffff" },
      { button: { "--color-bg": "#007bff" } },
      [],
    );
    expect(css.includes("button,")).toBe(true);
    expect(css.includes(".button,")).toBe(true);
    expect(css.includes('input[type="submit"]')).toBe(true);
    expect(parseThemeContent(css).scopes.button).toEqual({
      "--color-bg": "#007bff",
    });
  });

  test("emits body_classes comment when classes are provided", () => {
    const css = generateThemeCss({ "--color-bg": "#ffffff" }, {}, [
      "header-centered-dark",
      "main-boxed",
    ]);
    expect(parseThemeContent(css).bodyClasses).toEqual([
      "header-centered-dark",
      "main-boxed",
    ]);
  });

  test("omits body_classes comment when classes array is empty", () => {
    const css = generateThemeCss({ "--color-bg": "#ffffff" }, {}, []);
    expect(css.includes("/* body_classes")).toBe(false);
  });

  test("skips scopes whose override map is empty", () => {
    const css = generateThemeCss(
      {},
      {
        header: { "--color-text": "#fff" },
        nav: {},
        article: {},
      },
      [],
    );
    expect(css.includes("header {")).toBe(true);
    expect(css.includes("nav {")).toBe(false);
    expect(css.includes("article {")).toBe(false);
  });

  test("emits scope blocks in SCOPES declaration order", () => {
    const css = generateThemeCss(
      {},
      {
        button: { "--color-bg": "#007bff" },
        header: { "--color-text": "#fff" },
        nav: { "--color-link": "#00ff00" },
      },
      [],
    );
    const headerPos = css.indexOf("header {");
    const navPos = css.indexOf("nav {");
    const buttonPos = css.indexOf("button,");
    expect(headerPos).toBeLessThan(navPos);
    expect(navPos).toBeLessThan(buttonPos);
  });
});

describe("generateThemeCss + parseThemeContent round-trip", () => {
  test("preserves a minimal theme", () => {
    const theme = `:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
}

header {
  --color-text: #ffffff;
}

/* body_classes: header-centered-dark */`;
    const { parsed, reparsed } = roundTripTheme(theme);
    expect(reparsed).toEqual(parsed);
  });

  test("preserves a complex theme with multiple scopes", () => {
    const theme = `:root {
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
    const { parsed, reparsed } = roundTripTheme(theme);
    expect(reparsed).toEqual(parsed);
  });

  test("adding new scopes to a minimal theme produces parseable output", () => {
    const parsed = parseThemeContent(":root { --color-bg: #ffffff; }");
    const newScopeVars = {
      header: { "--color-text": "#ffffff" },
      nav: { "--color-bg": "#333333" },
    };
    const reparsed = parseThemeContent(
      generateThemeCss(parsed.root, newScopeVars, []),
    );
    expect(reparsed.scopes.header).toEqual(newScopeVars.header);
    expect(reparsed.scopes.nav).toEqual(newScopeVars.nav);
  });

  test("removing all scopes yields a theme with empty scopes", () => {
    const parsed = parseThemeContent(`:root { --color-bg: #ffffff; }

header {
  --color-text: #ffffff;
}`);
    expect(parsed.scopes.header).toEqual({ "--color-text": "#ffffff" });

    const reparsed = parseThemeContent(generateThemeCss(parsed.root, {}, []));
    expect(reparsed.scopes).toEqual({});
    expect(reparsed.root).toEqual(parsed.root);
  });

  test("preserves border values across round-trip", () => {
    const theme = `:root { --border: 2px solid #000000; }

header {
  --border: 3px solid #ff0000;
}`;
    const { parsed, reparsed } = roundTripTheme(theme);
    expect(reparsed.scopes.header).toEqual({ "--border": "3px solid #ff0000" });
    expect(reparsed.root).toEqual(parsed.root);
  });
});
