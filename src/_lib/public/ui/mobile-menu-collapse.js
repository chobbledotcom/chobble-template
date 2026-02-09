import { onReady } from "#public/utils/on-ready.js";

/**
 * Intercepts clicks on nav links to toggle submenus.
 * Allows users to expand/collapse submenu sections.
 * Activates when sticky-mobile-nav or clicky-nav is enabled.
 *
 * Uses event delegation on document so handlers survive DOM
 * replacement (e.g. Eleventy dev server morphdom live reload).
 *
 * Progressive enhancement: middle-click or JS-disabled users
 * will navigate to the parent page URL normally.
 */

const DROPDOWN_LINK = "nav > ul > li:has(> ul) > a";

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

const toggleDropdown = (link, isClicky) => {
  if (isClicky) {
    collapseSiblings(link.parentElement);
  }

  const isExpanded = link.parentElement.classList.toggle("expanded");
  link.setAttribute("aria-expanded", String(isExpanded));
};

onReady(() => {
  const isClicky = document.body.classList.contains("clicky-nav");
  const isStickyMobile = document.body.classList.contains("sticky-mobile-nav");

  if (!isClicky && !isStickyMobile) return;

  for (const link of document.querySelectorAll(DROPDOWN_LINK)) {
    link.setAttribute("aria-expanded", "false");
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest(DROPDOWN_LINK);

    if (link) {
      event.preventDefault();
      toggleDropdown(link, isClicky);
      return;
    }

    if (isClicky && !event.target.closest("nav")) {
      collapseAll();
    }
  });
});
