import { onReady } from "#public/utils/on-ready.js";

/**
 * Mode-based navigation dropdowns.
 * Detects hover capability via matchMedia and switches between:
 * - Hover mode: CSS :hover handles dropdowns (body gets nav-can-hover class)
 * - Click mode: JS injects a caret <button> next to each parent link
 *   that toggles the submenu. The <a> stays a normal navigable link.
 */

const createCaretButton = (item) => {
  const button = document.createElement("button");
  button.className = "nav-caret";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-label", "Toggle submenu");
  button.addEventListener("click", () => {
    const isExpanded = item.classList.toggle("expanded");
    button.setAttribute("aria-expanded", String(isExpanded));
  });
  return button;
};

const setupClickToggle = (item) => {
  if (item.querySelector(":scope > .nav-caret")) return;
  const submenu = item.querySelector(":scope > ul");
  if (!submenu) return;

  const button = createCaretButton(item);
  item.insertBefore(button, submenu);
};

const teardownClickToggle = (item) => {
  const button = item.querySelector(":scope > .nav-caret");
  if (button) button.remove();
  item.classList.remove("expanded");
};

const applyClickMode = (navItems) => {
  document.body.classList.remove("nav-can-hover");
  for (const item of navItems) {
    setupClickToggle(item);
  }
};

const applyHoverMode = (navItems) => {
  document.body.classList.add("nav-can-hover");
  for (const item of navItems) {
    teardownClickToggle(item);
  }
};

export const initNavDropdown = () => {
  const navToggle = document.getElementById("nav-toggle");
  if (navToggle) navToggle.checked = false;

  const navItems = document.querySelectorAll("nav > ul > li:has(> ul)");
  if (navItems.length === 0) return;

  const hoverQuery = window.matchMedia("(hover: hover)");
  const update = () =>
    hoverQuery.matches ? applyHoverMode(navItems) : applyClickMode(navItems);

  hoverQuery.addEventListener("change", update);
  update();
};

onReady(initNavDropdown);
