import { onReady } from "#public/utils/on-ready.js";

/**
 * Mode-based navigation dropdowns.
 * Detects hover capability via matchMedia and switches between:
 * - Hover mode: CSS :hover handles dropdowns (body gets nav-can-hover class)
 * - Click mode: JS click-toggles for submenus with aria-expanded
 *
 * Progressive enhancement: middle-click or JS-disabled users
 * will navigate to the parent page URL normally.
 */

const setupClickToggle = (item) => {
  if (item.classList.contains("js-toggle")) return;
  const link = item.querySelector(":scope > a");
  if (!link) return;

  item.classList.add("js-toggle");
  link.setAttribute("aria-expanded", "false");

  /* jscpd:ignore-start */
  link.addEventListener("click", (event) => {
    event.preventDefault();
    /* jscpd:ignore-end */
    const isExpanded = item.classList.toggle("expanded");
    link.setAttribute("aria-expanded", String(isExpanded));
  });
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
    item.classList.remove("expanded");
    const link = item.querySelector(":scope > a");
    if (link) link.removeAttribute("aria-expanded");
  }
};

onReady(() => {
  const navToggle = document.getElementById("nav-toggle");
  if (navToggle) navToggle.checked = false;

  const navItems = document.querySelectorAll("nav > ul > li:has(> ul)");
  if (navItems.length === 0) return;

  const hoverQuery = window.matchMedia("(hover: hover)");
  const update = () =>
    hoverQuery.matches ? applyHoverMode(navItems) : applyClickMode(navItems);

  hoverQuery.addEventListener("change", update);
  update();
});
