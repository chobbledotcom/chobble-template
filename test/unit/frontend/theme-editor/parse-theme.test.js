// Tests for parseThemeContent and parseBorderValue.
// These are pure functions that convert theme SCSS strings into
// structured data — they do not touch the DOM.

import { describe, expect, test } from "bun:test";
import {
  parseBorderValue,
  parseThemeContent,
  SCOPES,
} from "#public/theme/theme-editor-lib.js";

describe("parseThemeContent", () => {
  test("extracts CSS variables from :root block", () => {
    const theme = `:root {
  --color-bg: #ffffff;
  --color-text: #000000;
  --border: 2px solid #333;
}`;
    expect(parseThemeContent(theme).root).toEqual({
      "--color-bg": "#ffffff",
      "--color-text": "#000000",
      "--border": "2px solid #333",
    });
  });

  test("ignores non-custom properties in :root block", () => {
    const theme = `:root {
  --color-bg: #fff;
  background: red;
  color: green;
  --color-text: #000;
}`;
    expect(parseThemeContent(theme).root).toEqual({
      "--color-bg": "#fff",
      "--color-text": "#000",
    });
  });

  test("parses variables with compact whitespace between name and value", () => {
    const result = parseThemeContent(
      ":root { --color-bg:#fff;--color-text:  #000  ; }",
    );
    expect(result.root).toEqual({
      "--color-bg": "#fff",
      "--color-text": "#000",
    });
  });

  test("returns empty root/scopes/bodyClasses for empty input", () => {
    expect(parseThemeContent("")).toEqual({
      root: {},
      scopes: {},
      bodyClasses: [],
    });
  });

  test("parses single-selector scope variables", () => {
    const theme = `:root { --color-bg: #fff; }
header { --color-text: #ffffff; --color-bg: #333; }`;
    expect(parseThemeContent(theme).scopes.header).toEqual({
      "--color-text": "#ffffff",
      "--color-bg": "#333",
    });
  });

  test("parses multi-selector button scope", () => {
    const theme = `:root { --color-bg: #fff; }
button,
.button,
input[type="submit"] {
  --color-bg: #007bff;
}`;
    expect(parseThemeContent(theme).scopes.button).toEqual({
      "--color-bg": "#007bff",
    });
  });

  test("extracts body_classes comment as trimmed array", () => {
    const theme = `:root { --color-bg: #fff; }
/* body_classes: header-centered-dark, main-boxed */`;
    expect(parseThemeContent(theme).bodyClasses).toEqual([
      "header-centered-dark",
      "main-boxed",
    ]);
  });

  test("returns empty bodyClasses array when no comment present", () => {
    expect(
      parseThemeContent(":root { --color-bg: #fff; }").bodyClasses,
    ).toEqual([]);
  });

  test("omits missing scopes from the scopes object", () => {
    const theme = `:root { --color-bg: #fff; }
nav { --color-link: #00ff00; }`;
    const { scopes } = parseThemeContent(theme);
    const presentScopes = SCOPES.filter((scope) => scope in scopes);
    expect(presentScopes).toEqual(["nav"]);
  });
});

describe("parseBorderValue", () => {
  test("parses solid border into width/style/color", () => {
    expect(parseBorderValue("2px solid #000000")).toEqual({
      width: 2,
      style: "solid",
      color: "#000000",
    });
  });

  test("parses dashed border with different width", () => {
    expect(parseBorderValue("3px dashed #ff0000")).toEqual({
      width: 3,
      style: "dashed",
      color: "#ff0000",
    });
  });

  test("parses dotted border with single-digit width", () => {
    expect(parseBorderValue("1px dotted #333333")).toEqual({
      width: 1,
      style: "dotted",
      color: "#333333",
    });
  });

  test("returns null for empty string input", () => {
    expect(parseBorderValue("")).toBe(null);
  });

  test("returns null for null input", () => {
    expect(parseBorderValue(null)).toBe(null);
  });

  test("returns null for unparseable value", () => {
    expect(parseBorderValue("invalid")).toBe(null);
  });

  test("returns null when width has no px unit", () => {
    expect(parseBorderValue("2 solid #000")).toBe(null);
  });
});
