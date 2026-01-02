import { onReady } from "#assets/on-ready.js";

const isThemeEditorPage = () =>
  window.location.pathname.includes("/theme-editor/");

const getThemeList = () => {
  const computed = getComputedStyle(document.documentElement);
  const themeListStr = computed.getPropertyValue("--theme-list").trim();
  if (themeListStr) {
    // Remove quotes and split by comma
    const themes = themeListStr.replace(/['"]/g, "").split(",");
    return themes;
  }
  // Fallback to a default list if CSS variable not found
  return ["default"];
};

const getThemeDisplayName = (themeName) => {
  const computed = getComputedStyle(document.documentElement);
  const displayName = computed
    .getPropertyValue(`--theme-${themeName}-name`)
    .trim();
  return displayName ? displayName.replace(/['"]/g, "") : themeName;
};

const getCurrentTheme = () => localStorage.getItem("theme_name") || "default";

const setCurrentTheme = (themeName) =>
  localStorage.setItem("theme_name", themeName);

const themeFonts = {
  floral: "princess-sofia:400",
  hacker: "share-tech-mono:400",
  neon: "orbitron:600",
};

const loadFontForTheme = (themeName) => {
  const fontLinkId = "theme-font-link";

  // Remove existing font link if present
  document.getElementById(fontLinkId)?.remove();

  // Add font link if theme has a custom font
  if (themeFonts[themeName]) {
    const fontLink = document.createElement("link");
    fontLink.id = fontLinkId;
    fontLink.rel = "stylesheet";
    fontLink.href = `https://fonts.bunny.net/css?family=${themeFonts[themeName]}`;
    document.head.appendChild(fontLink);
  }
};

const applyTheme = (themeName) => {
  if (themeName === "default") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", themeName);
  }
  loadFontForTheme(themeName);
};

const updateButtonText = (themeName) => {
  const button = document.getElementById("theme-switcher-button");
  if (button) {
    const displayName = getThemeDisplayName(themeName);
    button.setAttribute(
      "aria-label",
      `Current theme: ${displayName}. Click to switch theme`,
    );
  }
};

const cycleTheme = () => {
  const themes = getThemeList();
  const currentTheme = getCurrentTheme();
  const currentIndex = themes.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % themes.length;
  const nextTheme = themes[nextIndex];

  setCurrentTheme(nextTheme);
  applyTheme(nextTheme);
  updateButtonText(nextTheme);
};

const initThemeSwitcher = () => {
  const button = document.getElementById("theme-switcher-button");
  if (!button) return;
  if (isThemeEditorPage()) {
    // Hide button and reset theme on theme-editor page
    button.style.display = "none";
    setCurrentTheme("default");
    applyTheme("default");
  } else {
    // Show button on other pages
    button.style.display = "";
    const currentTheme = getCurrentTheme();
    applyTheme(currentTheme);
    updateButtonText(currentTheme);
    button.addEventListener("click", cycleTheme);
  }
};

onReady(initThemeSwitcher);
