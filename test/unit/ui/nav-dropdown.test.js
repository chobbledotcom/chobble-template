import { afterEach, describe, expect, test, vi } from "vitest";
import { initNavDropdown } from "#public/ui/nav-dropdown.js";
import { noop } from "#test/test-utils.js";

const NAV_HTML = `
<nav class="site-nav" data-submenu-label="Untermenü anzeigen">
  <div class="site-menu">
  <ul>
    <li>
      <a href="/products/">Products</a>
      <ul>
        <li><a href="/products/a/">A</a></li>
      </ul>
    </li>
    <li><a href="/about/">About</a></li>
  </ul>
  </div>
</nav>
`;

const initWithMode = (hoverMatches) => {
  document.body.innerHTML = NAV_HTML;
  const state = { onChange: noop };
  const query = {
    matches: hoverMatches,
    addEventListener: (_event, fn) => {
      state.onChange = fn;
    },
    removeEventListener: noop,
  };
  vi.spyOn(window, "matchMedia").mockReturnValue(query);
  initNavDropdown();
  return (newMatches) => {
    query.matches = newMatches;
    state.onChange(query);
  };
};

const parentItem = () =>
  document.querySelector(".site-menu > ul > li:has(> ul)");

const clickCaretAndExpectExpanded = (button, expanded) => {
  button.click();
  expect(parentItem().classList.contains("expanded")).toBe(expanded);
  expect(button.getAttribute("aria-expanded")).toBe(String(expanded));
};

afterEach(() => {
  vi.restoreAllMocks();
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
    // Named in the page language, from the nav's data-submenu-label
    expect(button.getAttribute("aria-label")).toBe("Untermenü anzeigen");
  });

  test("does not inject button on items without submenus", () => {
    initWithMode(false);

    const leaf = document.querySelector(".site-menu > ul > li:last-child");
    expect(leaf.querySelector(".nav-caret")).toBeNull();
  });

  test("clicking the caret button toggles expanded and aria", () => {
    initWithMode(false);

    const button = parentItem().querySelector(".nav-caret");
    clickCaretAndExpectExpanded(button, true);
    clickCaretAndExpectExpanded(button, false);
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
  test("uses one hover snapshot for the body and every dropdown per update", () => {
    document.body.innerHTML = NAV_HTML;
    parentItem().after(parentItem().cloneNode(true));
    const query = new EventTarget();
    const readMatches = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValue(false);
    Object.defineProperty(query, "matches", { get: readMatches });
    vi.spyOn(window, "matchMedia").mockReturnValue(query);

    initNavDropdown();

    expect(document.body.classList.contains("nav-can-hover")).toBe(false);
    expect(document.querySelectorAll(".nav-caret")).toHaveLength(2);

    query.dispatchEvent(new Event("change"));

    expect(document.body.classList.contains("nav-can-hover")).toBe(true);
    expect(document.querySelectorAll(".nav-caret")).toHaveLength(0);
    expect(readMatches).toHaveBeenCalledTimes(2);
  });

  test("switching from hover to click injects buttons", () => {
    const switchMode = initWithMode(true);
    switchMode(false);

    expect(parentItem().querySelector(".nav-caret")).not.toBeNull();
  });

  test("switching from click to hover removes buttons", () => {
    const switchMode = initWithMode(false);
    parentItem().querySelector(".nav-caret").click();
    switchMode(true);

    expect(parentItem().querySelector(".nav-caret")).toBeNull();
    expect(parentItem().classList.contains("expanded")).toBe(false);
  });

  test("repeated click-mode notifications preserve the expanded caret", () => {
    const switchMode = initWithMode(false);
    const button = parentItem().querySelector(".nav-caret");
    button.click();

    switchMode(false);
    switchMode(false);

    expect(parentItem().querySelectorAll(".nav-caret")).toHaveLength(1);
    expect(parentItem().querySelector(".nav-caret")).toBe(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    clickCaretAndExpectExpanded(button, false);
  });

  test("returning to click mode creates a working collapsed caret", () => {
    const switchMode = initWithMode(false);
    const oldButton = parentItem().querySelector(".nav-caret");
    oldButton.click();

    switchMode(true);
    switchMode(false);

    const button = parentItem().querySelector(".nav-caret");
    expect(button).not.toBe(oldButton);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.classList.contains("nav-can-hover")).toBe(false);
    clickCaretAndExpectExpanded(button, true);
  });

  test("skips a submenu removed before switching to click mode", () => {
    const switchMode = initWithMode(true);
    const item = parentItem();
    item.querySelector(":scope > ul").remove();

    switchMode(false);

    expect(item.querySelector(".nav-caret")).toBeNull();
  });

  test("caret listeners toggle only their own parent item", () => {
    const switchMode = initWithMode(true);
    const first = parentItem();
    const second = first.cloneNode(true);
    first.after(second);
    initNavDropdown();
    switchMode(false);

    second.querySelector(".nav-caret").click();

    expect(first.classList.contains("expanded")).toBe(false);
    expect(
      first.querySelector(".nav-caret").getAttribute("aria-expanded"),
    ).toBe("false");
    expect(second.classList.contains("expanded")).toBe(true);
    expect(
      second.querySelector(".nav-caret").getAttribute("aria-expanded"),
    ).toBe("true");
  });
});
