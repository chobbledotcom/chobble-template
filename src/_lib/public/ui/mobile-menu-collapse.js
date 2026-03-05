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

  // Mark this item as JS-managed so CSS defers to the expanded class
  item.classList.add("js-toggle");

  // All dropdowns start collapsed on page load
  link.setAttribute("aria-expanded", "false");

  if (caretButton) {
    // Caret button always toggles expand/collapse
    caretButton.addEventListener("click", () => {
      collapseSiblings(item);
      const isExpanded = !item.classList.contains("expanded");
      setExpanded(item, isExpanded);
    });
  }

  link.addEventListener("click", (event) => {
    // When the caret button is visible (desktop clicky-nav), the link
    // navigates to the parent page when the submenu is already expanded.
    // When the caret is hidden (mobile), the link toggles the submenu
    // since there is no other control to expand/collapse it.
    const caretVisible = caretButton?.offsetParent !== null;

    if (caretVisible && item.classList.contains("expanded")) {
      return; // Allow navigation to parent page
    }

    event.preventDefault();
    if (isClicky) {
      collapseSiblings(item);
    }
    setExpanded(item, !item.classList.contains("expanded"));
  });
};

onReady(() => {
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
