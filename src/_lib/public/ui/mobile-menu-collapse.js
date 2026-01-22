import { onReady } from "#public/utils/on-ready.js";

/**
 * Creates toggle buttons for nav items with submenus.
 * Allows users to expand/collapse submenu sections on mobile.
 * Only activates when sticky-mobile-nav is enabled.
 */
onReady(() => {
  if (!document.body.classList.contains("sticky-mobile-nav")) return;

  const navItems = document.querySelectorAll("nav > ul li:has(> ul)");

  for (const item of navItems) {
    // Skip if toggle already exists
    if (item.querySelector(".mobile-menu-toggle")) continue;

    const toggle = document.createElement("button");
    toggle.className = "mobile-menu-toggle";
    toggle.setAttribute("aria-label", "Toggle submenu");
    toggle.setAttribute("aria-expanded", "false");

    // Insert toggle after the link
    const link = item.querySelector(":scope > a");
    if (link) {
      link.after(toggle);
    } else {
      item.prepend(toggle);
    }

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const isExpanded = item.classList.toggle("expanded");
      toggle.setAttribute("aria-expanded", String(isExpanded));
    });
  }
});
