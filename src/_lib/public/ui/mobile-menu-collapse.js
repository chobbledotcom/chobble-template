import { onReady } from "#public/utils/on-ready.js";

/**
 * Intercepts clicks on nav links to toggle submenus.
 * Allows users to expand/collapse submenu sections.
 * Activates when sticky-mobile-nav or clicky-nav is enabled.
 *
 * Progressive enhancement: middle-click or JS-disabled users
 * will navigate to the parent page URL normally.
 */

const collapseItem = (item) => {
  item.classList.remove("expanded");
  const link = item.querySelector(":scope > a");
  if (link) {
    link.setAttribute("aria-expanded", "false");
  }
};

const collapseSiblings = (item) => {
  for (const sibling of item.parentElement.children) {
    if (sibling !== item && sibling.classList.contains("expanded")) {
      collapseItem(sibling);
    }
  }
};

const collapseAll = () => {
  const expanded = document.querySelectorAll("nav li.expanded");
  for (const item of expanded) {
    collapseItem(item);
  }
};

const setupLinkToggle = (item, isClicky) => {
  const link = item.querySelector(":scope > a");
  if (!link) return;

  // Mark this item as JS-managed so CSS defers to the expanded class
  item.classList.add("js-toggle");

  // If a child link is active (current page), start expanded
  const hasActiveChild = item.querySelector(":scope > ul a.active");
  if (hasActiveChild) {
    item.classList.add("expanded");
    link.setAttribute("aria-expanded", "true");
  } else {
    link.setAttribute("aria-expanded", "false");
  }

  link.addEventListener("click", (event) => {
    event.preventDefault();

    if (isClicky) {
      collapseSiblings(item);
    }

    const isExpanded = item.classList.toggle("expanded");
    link.setAttribute("aria-expanded", String(isExpanded));
  });
};

onReady(() => {
  // Force nav-toggle closed on page load. Browsers may restore checkbox state
  // via autocomplete or bfcache, causing the menu to appear open on load.
  const navToggle = document.getElementById("nav-toggle");
  if (navToggle) {
    navToggle.checked = false;
  }

  const isClicky = document.body.classList.contains("clicky-nav");
  const isStickyMobile = document.body.classList.contains("sticky-mobile-nav");

  if (!isClicky && !isStickyMobile) return;

  const navItems = document.querySelectorAll("nav > ul > li:has(> ul)");

  for (const item of navItems) {
    setupLinkToggle(item, isClicky);
  }

  if (isClicky) {
    document.addEventListener("click", (event) => {
      if (!event.target.closest("nav")) {
        collapseAll();
      }
    });
  }
});
