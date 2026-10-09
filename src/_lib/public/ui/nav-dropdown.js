/**
 * Mode-based navigation dropdowns.
 * Detects hover capability via matchMedia and switches between:
 * - Hover mode: CSS :hover handles dropdowns (body gets nav-can-hover class)
 * - Click mode: JS injects a caret <button> next to each parent link
 *   that toggles the submenu. The <a> stays a normal navigable link.
 */

const updateNavMode = (navItems, canHover, submenuLabel) => {
  document.body.classList.toggle("nav-can-hover", canHover);
  for (const item of navItems) {
    const existingButton = item.querySelector(":scope > .nav-caret");
    if (canHover) {
      existingButton?.remove();
      item.classList.remove("expanded");
      continue;
    }
    if (existingButton) continue;
    const submenu = item.querySelector(":scope > ul");
    if (!submenu) continue;

    const button = document.createElement("button");
    button.className = "nav-caret";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", submenuLabel);
    button.addEventListener("click", () => {
      const isExpanded = item.classList.toggle("expanded");
      button.setAttribute("aria-expanded", String(isExpanded));
    });
    item.insertBefore(button, submenu);
  }
};

export const initNavDropdown = () => {
  const nav = document.querySelector("nav.site-nav");
  const navItems = document.querySelectorAll(
    "nav.site-nav .site-menu > ul > li:has(> ul)",
  );
  if (!nav || navItems.length === 0) return;
  // The caret buttons are named in the page language, from navigation.html
  const submenuLabel = nav.getAttribute("data-submenu-label");

  const hoverQuery = window.matchMedia("(hover: hover)");
  hoverQuery.addEventListener("change", () =>
    updateNavMode(navItems, hoverQuery.matches, submenuLabel),
  );
  updateNavMode(navItems, hoverQuery.matches, submenuLabel);
};
