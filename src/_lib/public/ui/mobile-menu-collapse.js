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

const setExpanded = (item, expanded) => {
  const link = item.querySelector(":scope > a");
  const caret = item.querySelector(":scope > .nav-caret");
  if (link) link.setAttribute("aria-expanded", String(expanded));
  if (caret) caret.setAttribute("aria-expanded", String(expanded));
  if (expanded) {
    item.classList.add("expanded");
  } else {
    item.classList.remove("expanded");
  }
};

const setupLinkToggle = (item, isClicky) => {
  const link = item.querySelector(":scope > a");
  if (!link) return;

  const caretButton = item.querySelector(":scope > .nav-caret");

  link.setAttribute("aria-expanded", "false");

  if (isClicky && caretButton) {
    // Desktop clicky-nav: separate caret button for toggling
    caretButton.addEventListener("click", () => {
      collapseSiblings(item);
      const isExpanded = !item.classList.contains("expanded");
      setExpanded(item, isExpanded);
    });

    // Link: expand on first click, navigate when already expanded
    link.addEventListener("click", (event) => {
      if (item.classList.contains("expanded")) {
        return; // Allow navigation to parent page
      }
      event.preventDefault();
      collapseSiblings(item);
      setExpanded(item, true);
    });
  } else {
    // Mobile or fallback: link toggles submenu
    link.addEventListener("click", (event) => {
      event.preventDefault();

      if (isClicky) {
        collapseSiblings(item);
      }

      const isExpanded = item.classList.toggle("expanded");
      link.setAttribute("aria-expanded", String(isExpanded));
    });
  }
};

onReady(() => {
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
