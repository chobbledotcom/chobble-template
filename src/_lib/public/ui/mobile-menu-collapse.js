import { onReady } from "#public/utils/on-ready.js";

/**
 * Intercepts clicks on nav links to toggle submenus.
 * Allows users to expand/collapse submenu sections.
 * Activates when sticky-mobile-nav is enabled.
 *
 * Progressive enhancement: middle-click or JS-disabled users
 * will navigate to the parent page URL normally.
 */

const setupLinkToggle = (item) => {
  const link = item.querySelector(":scope > a");
  if (!link) return;

  // Mark this item as JS-managed so CSS defers to the expanded class
  item.classList.add("js-toggle");

  // All dropdowns start collapsed on page load
  link.setAttribute("aria-expanded", "false");

  // Link toggles submenu
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const isExpanded = item.classList.toggle("expanded");
    link.setAttribute("aria-expanded", String(isExpanded));
  });
};

onReady(() => {
  const navToggle = document.getElementById("nav-toggle");
  if (navToggle) {
    navToggle.checked = false;
  }

  const isStickyMobile = document.body.classList.contains("sticky-mobile-nav");

  if (!isStickyMobile) return;

  const navItems = document.querySelectorAll("nav > ul > li:has(> ul)");

  for (const item of navItems) {
    setupLinkToggle(item);
  }
});
