import { afterEach, describe, expect, test, vi } from "vitest";

/** Load the menu script fresh: it sets up every nav.site-nav on the page. */
const initSiteMenu = async () => {
  vi.resetModules();
  await import("#public/ui/site-menu.js");
};

// The markup navigation.html renders: buttons hidden, menu expanded.
const NAV_HTML = `
<nav class="site-nav" data-collapse="always">
  <button type="button" class="menu-toggle" aria-controls="site-menu" aria-expanded="false" hidden>Menu</button>
  <div class="site-menu" id="site-menu">
    <button type="button" class="menu-close" aria-label="Close menu" hidden>x</button>
    <ul><li><a href="/">Home</a></li><li><a href="/about/">About</a></li></ul>
  </div>
  <ul class="language-links"><li><a href="/de/">Deutsch</a></li></ul>
</nav>
<main><a href="/page-link/">A link in the page</a></main>
`;

const nav = () => document.querySelector("nav.site-nav");
const toggle = () => document.querySelector(".menu-toggle");
const closeButton = () => document.querySelector(".menu-close");
const menuLink = () => document.querySelector(".site-menu a");

const setUp = async () => {
  document.body.innerHTML = NAV_HTML;
  await initSiteMenu();
};

const openMenu = async () => {
  await setUp();
  toggle().click();
  menuLink().focus();
};

const expectClosed = () => {
  expect(nav().dataset.menu).toBe("closed");
  expect(toggle().getAttribute("aria-expanded")).toBe("false");
  expect(document.documentElement.hasAttribute("data-menu-open")).toBe(false);
};

/** Focus arriving on another element, as the browser reports it. */
const moveFocus = (to) =>
  to.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-menu-open");
});

describe("site menu", () => {
  test("reveals the toggle and close buttons and starts closed", async () => {
    await setUp();

    expect(toggle().hidden).toBe(false);
    expect(closeButton().hidden).toBe(false);
    expectClosed();
  });

  test("the toggle opens and closes the menu", async () => {
    await setUp();

    toggle().click();
    expect(nav().dataset.menu).toBe("open");
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(document.documentElement.hasAttribute("data-menu-open")).toBe(true);

    toggle().click();
    expectClosed();
  });

  test("Escape inside the open menu closes it and returns focus to the toggle", async () => {
    await openMenu();

    menuLink().dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );

    expectClosed();
    expect(document.activeElement).toBe(toggle());
  });

  test("other keys leave the menu open", async () => {
    await openMenu();

    menuLink().dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
    );

    expect(nav().dataset.menu).toBe("open");
  });

  test("the close button closes the menu and returns focus to the toggle", async () => {
    await openMenu();

    closeButton().click();

    expectClosed();
    expect(document.activeElement).toBe(toggle());
  });

  test("focus leaving the menu closes it, so it never hides the focused element", async () => {
    await openMenu();

    moveFocus(document.querySelector("main a"));

    expectClosed();
  });

  test("focus moving to the header beside the menu closes it too", async () => {
    await openMenu();

    moveFocus(document.querySelector(".language-links a"));

    expectClosed();
  });

  test("focus moving within the menu or to its toggle keeps it open", async () => {
    await openMenu();

    moveFocus(closeButton());
    expect(nav().dataset.menu).toBe("open");

    moveFocus(toggle());
    expect(nav().dataset.menu).toBe("open");
  });

  test("leaves a nav without a toggle (collapse_menu: never) expanded", async () => {
    document.body.innerHTML =
      '<nav class="site-nav"><div class="site-menu"><ul></ul></div></nav>';

    await initSiteMenu();

    expect(nav().hasAttribute("data-menu")).toBe(false);
  });
});
