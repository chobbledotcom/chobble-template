// Tests for the DOM-touching helpers in theme-editor-lib: form accessors,
// control-to-var conversion, and body class collection. These tests share
// happy-dom globals with other tests in the same process, so we reset
// document state (body markup, body classes, and root inline styles)
// between each test.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  collectActiveClasses,
  controlToVarEntry,
  createFormEl,
  inputToScopedEntry,
  isControlEnabled,
} from "#public/theme/theme-editor-lib.js";

// Reset document state between tests so mutations (inline styles on
// document root, body markup, body classes) don't leak across cases —
// happy-dom is shared within a test process.
const resetDomState = () => {
  document.body.innerHTML = "";
  document.body.className = "";
  const style = document.documentElement.style;
  const customProps = Array.from(style, (name) => name).filter((name) =>
    name.startsWith("--"),
  );
  for (const name of customProps) style.removeProperty(name);
};

// Mount a <form id=...> wrapper containing `html` and return a formEl
// selector scoped to it, so each test works on a well-known form.
const mountForm = (formId, html) => {
  document.body.innerHTML = `<form id="${formId}">${html}</form>`;
  return createFormEl(formId);
};

// Set a global CSS variable on :root and return a helper that builds an
// input bound to that variable, then runs it through inputToScopedEntry.
const withGlobalVar = (varName, globalValue) => (inputValue) => {
  document.documentElement.style.setProperty(varName, globalValue);
  const input = document.createElement("input");
  input.dataset.var = varName;
  input.value = inputValue;
  const docStyle = getComputedStyle(document.documentElement);
  return inputToScopedEntry(docStyle)(input);
};

beforeEach(resetDomState);
afterEach(resetDomState);

describe("createFormEl", () => {
  test("returns elements scoped to the form", () => {
    const formEl = mountForm(
      "theme-form",
      `<input id="color-bg" type="color" value="#ffffff">
       <input id="color-text" type="color" value="#000000">`,
    );
    expect(formEl("color-bg")?.id).toBe("color-bg");
    expect(formEl("color-text")?.id).toBe("color-text");
  });

  test("returns null for missing ids", () => {
    const formEl = mountForm(
      "theme-form",
      `<input id="color-bg" type="color" value="#ffffff">`,
    );
    expect(formEl("non-existent")).toBe(null);
  });

  test("ignores elements outside the form", () => {
    document.body.innerHTML = `
      <input id="stray" type="color" value="#ff0000">
      <form id="theme-form"><input id="color-bg" type="color" value="#fff"></form>
    `;
    const formEl = createFormEl("theme-form");
    expect(formEl("stray")).toBe(null);
    expect(formEl("color-bg")?.id).toBe("color-bg");
  });
});

describe("isControlEnabled", () => {
  test("treats a control with no enable checkbox as enabled", () => {
    const formEl = mountForm(
      "test-form",
      `<input id="color-bg" type="color" value="#ffffff">`,
    );
    expect(isControlEnabled(formEl)(formEl("color-bg"))).toBe(true);
  });

  test("returns true when enable checkbox is checked", () => {
    const formEl = mountForm(
      "test-form",
      `<input id="color-bg" type="color" value="#ffffff">
       <input id="color-bg-enabled" type="checkbox" checked>`,
    );
    expect(isControlEnabled(formEl)(formEl("color-bg"))).toBe(true);
  });

  test("returns false when enable checkbox is unchecked", () => {
    const formEl = mountForm(
      "test-form",
      `<input id="color-text" type="color" value="#000000">
       <input id="color-text-enabled" type="checkbox">`,
    );
    expect(isControlEnabled(formEl)(formEl("color-text"))).toBe(false);
  });
});

describe("controlToVarEntry", () => {
  test("returns [--id, value] tuple for a colour input", () => {
    const input = document.createElement("input");
    input.id = "color-bg";
    input.value = "#ff0000";
    expect(controlToVarEntry(input)).toEqual(["--color-bg", "#ff0000"]);
  });

  test("applies the value to document root as a live preview", () => {
    const input = document.createElement("input");
    input.id = "color-bg";
    input.value = "#ff0000";
    controlToVarEntry(input);
    expect(document.documentElement.style.getPropertyValue("--color-bg")).toBe(
      "#ff0000",
    );
  });

  test("appends px unit for border-radius control", () => {
    const input = document.createElement("input");
    input.id = "border-radius";
    input.value = "8";
    expect(controlToVarEntry(input)).toEqual(["--border-radius", "8px"]);
    expect(
      document.documentElement.style.getPropertyValue("--border-radius"),
    ).toBe("8px");
  });
});

describe("inputToScopedEntry", () => {
  test("returns an entry when scoped value differs from global", () => {
    expect(withGlobalVar("--color-bg", "#ffffff")("#ff0000")).toEqual([
      "--color-bg",
      "#ff0000",
    ]);
  });

  test("returns null when scoped value equals global", () => {
    expect(withGlobalVar("--color-bg", "#ffffff")("#ffffff")).toBe(null);
  });

  test("returns null when scoped value is empty", () => {
    expect(withGlobalVar("--color-bg", "#ffffff")("")).toBe(null);
  });
});

describe("collectActiveClasses", () => {
  test("toggles the selected class onto the body", () => {
    const formEl = mountForm(
      "test-form",
      `<select id="header-style">
         <option value="">None</option>
         <option value="header-dark">Dark Header</option>
         <option value="header-light">Light Header</option>
       </select>`,
    );
    formEl("header-style").value = "header-dark";
    const active = collectActiveClasses(formEl)(formEl("header-style"));
    expect(active).toEqual(["header-dark"]);
    expect(document.body.classList.contains("header-dark")).toBe(true);
  });

  test("removes previously-toggled classes when value changes", () => {
    const formEl = mountForm(
      "test-form",
      `<select id="header-style">
         <option value="header-dark">Dark</option>
         <option value="header-light">Light</option>
       </select>`,
    );
    formEl("header-style").value = "header-dark";
    collectActiveClasses(formEl)(formEl("header-style"));
    expect(document.body.classList.contains("header-dark")).toBe(true);

    formEl("header-style").value = "header-light";
    const active = collectActiveClasses(formEl)(formEl("header-style"));
    expect(active).toEqual(["header-light"]);
    expect(document.body.classList.contains("header-dark")).toBe(false);
    expect(document.body.classList.contains("header-light")).toBe(true);
  });

  test("returns empty and strips classes when enable checkbox is unchecked", () => {
    const formEl = mountForm(
      "test-form",
      `<select id="header-style"><option value="header-dark">Dark</option></select>
       <input id="header-style-enabled" type="checkbox">`,
    );
    formEl("header-style").value = "header-dark";
    // Pre-toggle the class so we can verify it is stripped.
    document.body.classList.add("header-dark");
    expect(collectActiveClasses(formEl)(formEl("header-style"))).toEqual([]);
    expect(document.body.classList.contains("header-dark")).toBe(false);
  });

  test("returns empty array when no option is selected", () => {
    const formEl = mountForm(
      "test-form",
      `<select id="header-style">
         <option value="" selected>None</option>
         <option value="header-dark">Dark</option>
       </select>`,
    );
    expect(collectActiveClasses(formEl)(formEl("header-style"))).toEqual([]);
    expect(document.body.classList.length).toBe(0);
  });
});
