import { onReady } from "#public/utils/on-ready.js";

/**
 * Creates toggle buttons for nav items with submenus.
 * Allows users to expand/collapse submenu sections.
 * Activates when sticky-mobile-nav or clicky-nav is enabled.
 */

const collapseItem = (item) => {
  item.classList.remove("expanded");
  const toggle = item.querySelector(":scope > span > .mobile-menu-toggle");
  if (toggle) {
    toggle.setAttribute("aria-expanded", "false");
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

const createToggleButton = (item, isClicky) => {
  const toggle = document.createElement("button");
  toggle.className = "mobile-menu-toggle";
  toggle.setAttribute("aria-label", "Toggle submenu");
  toggle.setAttribute("aria-expanded", "false");

  const link = item.querySelector(":scope > span > a");
  if (link) {
    link.after(toggle);
  } else {
    item.prepend(toggle);
  }

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isClicky) {
      collapseSiblings(item);
    }

    const isExpanded = item.classList.toggle("expanded");
    toggle.setAttribute("aria-expanded", String(isExpanded));
  });
};

onReady(() => {
  const isClicky = document.body.classList.contains("clicky-nav");
  const isStickyMobile = document.body.classList.contains("sticky-mobile-nav");

  if (!isClicky && !isStickyMobile) return;

  const navItems = document.querySelectorAll("nav > ul li:has(> ul)");

  for (const item of navItems) {
    if (item.querySelector(".mobile-menu-toggle")) continue;
    createToggleButton(item, isClicky);
  }

  if (isClicky) {
    document.addEventListener("click", (event) => {
      if (!event.target.closest("nav")) {
        collapseAll();
      }
    });
  }
});
