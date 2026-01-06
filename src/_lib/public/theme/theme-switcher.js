import { onReady } from "#assets/utils/on-ready.js";

const setCurrentTheme = (themeName) =>
  localStorage.setItem("theme_name", themeName);

const themeFonts = {
  floral: "princess-sofia:400",
  hacker: "share-tech-mono:400",
  neon: "orbitron:600",
};

const applyTheme = (themeName) => {
  if (themeName === "default") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", themeName);
  }

  const fontLinkId = "theme-font-link";
  document.getElementById(fontLinkId)?.remove();
  if (themeFonts[themeName]) {
    const fontLink = document.createElement("link");
    fontLink.id = fontLinkId;
    fontLink.rel = "stylesheet";
    fontLink.href = `https://fonts.bunny.net/css?family=${themeFonts[themeName]}`;
    document.head.appendChild(fontLink);
  }
};

const updateButtonText = (themeName) => {
  const button = document.getElementById("theme-switcher-button");
  if (button) {
    const computed = getComputedStyle(document.documentElement);
    const displayName = computed
      .getPropertyValue(`--theme-${themeName}-name`)
      .trim();
    const resolvedDisplayName = displayName
      ? displayName.replace(/['"]/g, "")
      : themeName;

    button.setAttribute(
      "aria-label",
      `Current theme: ${resolvedDisplayName}. Click to switch theme`,
    );
  }
};

const cycleTheme = () => {
  const computed = getComputedStyle(document.documentElement);
  const themeListStr = computed.getPropertyValue("--theme-list").trim();
  const themes = themeListStr
    ? themeListStr.replace(/['"]/g, "").split(",")
    : ["default"];

  const currentTheme = localStorage.getItem("theme_name") || "default";

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
  if (window.location.pathname.includes("/theme-editor/")) {
    // Hide button and reset theme on theme-editor page
    button.style.display = "none";
    setCurrentTheme("default");
    applyTheme("default");
  } else {
    // Show button on other pages
    button.style.display = "";
    const currentTheme = localStorage.getItem("theme_name") || "default";
    applyTheme(currentTheme);
    updateButtonText(currentTheme);
    button.addEventListener("click", cycleTheme);
  }
};

onReady(initThemeSwitcher);
