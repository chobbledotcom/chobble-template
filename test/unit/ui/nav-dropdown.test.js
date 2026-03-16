import { afterEach, describe, expect, test } from "bun:test";
import { initNavDropdown } from "#public/ui/nav-dropdown.js";

const NAV_HTML = `
<nav>
  <ul>
    <li>
      <a href="/products/">Products</a>
      <ul>
        <li><a href="/products/a/">A</a></li>
      </ul>
    </li>
    <li><a href="/about/">About</a></li>
  </ul>
</nav>
`;

const initWithMode = (hoverMatches) => {
  document.body.innerHTML = NAV_HTML;
  // biome-ignore lint/suspicious/noEmptyBlockStatements: noop stub
  const state = { onChange: () => {} };
  const query = {
    matches: hoverMatches,
    addEventListener: (_event, fn) => {
      state.onChange = fn;
    },
    // biome-ignore lint/suspicious/noEmptyBlockStatements: noop stub
    removeEventListener: () => {},
  };
  const original = window.matchMedia;
  window.matchMedia = () => query;
  initNavDropdown();
  window.matchMedia = original;
  return (newMatches) => {
    query.matches = newMatches;
    state.onChange(query);
  };
};

const parentItem = () => document.querySelector("nav > ul > li:has(> ul)");

afterEach(() => {
  document.body.innerHTML = "";
  document.body.className = "";
});

describe("click mode (no hover)", () => {
  test("injects a .nav-caret button with correct attributes", () => {
    initWithMode(false);

    const button = parentItem().querySelector(":scope > .nav-caret");
    expect(button).not.toBeNull();
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-label")).toBe("Toggle submenu");
  });

  test("does not inject button on items without submenus", () => {
    initWithMode(false);

    const leaf = document.querySelector("nav > ul > li:last-child");
    expect(leaf.querySelector(".nav-caret")).toBeNull();
  });

  test("clicking the caret button toggles expanded and aria", () => {
    initWithMode(false);

    const button = parentItem().querySelector(".nav-caret");
    button.click();

    expect(parentItem().classList.contains("expanded")).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("true");

    button.click();

    expect(parentItem().classList.contains("expanded")).toBe(false);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  test("link remains navigable without aria-expanded", () => {
    initWithMode(false);

    const link = parentItem().querySelector(":scope > a");
    expect(link.getAttribute("href")).toBe("/products/");
    expect(link.getAttribute("aria-expanded")).toBeNull();
  });

  test("removes nav-can-hover class from body", () => {
    initWithMode(false);

    expect(document.body.classList.contains("nav-can-hover")).toBe(false);
  });
});

describe("hover mode", () => {
  test("does not inject caret buttons", () => {
    initWithMode(true);

    expect(parentItem().querySelector(".nav-caret")).toBeNull();
  });

  test("adds nav-can-hover class to body", () => {
    initWithMode(true);

    expect(document.body.classList.contains("nav-can-hover")).toBe(true);
  });
});

describe("mode switching", () => {
  test("switching from hover to click injects buttons", () => {
    const switchMode = initWithMode(true);
    switchMode(false);

    expect(parentItem().querySelector(".nav-caret")).not.toBeNull();
  });

  test("switching from click to hover removes buttons", () => {
    const switchMode = initWithMode(false);
    switchMode(true);

    expect(parentItem().querySelector(".nav-caret")).toBeNull();
    expect(parentItem().classList.contains("expanded")).toBe(false);
  });
});
