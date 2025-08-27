(function() {
  function isThemeEditorPage() {
    return window.location.pathname.includes('/theme-editor/');
  }

  function getThemeCount() {
    const computed = getComputedStyle(document.documentElement);
    return parseInt(computed.getPropertyValue('--theme-count').trim(), 10) || 6;
  }

  function getThemeName(themeId) {
    const computed = getComputedStyle(document.documentElement);
    const name = computed.getPropertyValue(`--theme-${themeId}-name`).trim();
    return name ? name.replace(/['"]/g, '') : `Theme ${themeId}`;
  }

  function getCurrentThemeId() {
    const stored = localStorage.getItem('theme_id');
    return stored ? parseInt(stored, 10) : 0;
  }

  function setThemeId(id) {
    localStorage.setItem('theme_id', id.toString());
  }

  const themeFonts = {
    2: 'princess-sofia:400',  // Floral
    3: 'share-tech-mono:400', // Hacker
    5: 'orbitron:600'         // Neon
  };

  function loadFontForTheme(themeId) {
    const fontLinkId = 'theme-font-link';
    let fontLink = document.getElementById(fontLinkId);
    
    // Remove existing font link if present
    if (fontLink) {
      fontLink.remove();
    }
    
    // Add font link if theme has a custom font
    if (themeFonts[themeId]) {
      fontLink = document.createElement('link');
      fontLink.id = fontLinkId;
      fontLink.rel = 'stylesheet';
      fontLink.href = `https://fonts.bunny.net/css?family=${themeFonts[themeId]}`;
      document.head.appendChild(fontLink);
    }
  }

  function applyTheme(themeId) {
    if (themeId === 0) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeId.toString());
    }
    loadFontForTheme(themeId);
  }

  function cycleTheme() {
    const themeCount = getThemeCount();
    const currentId = getCurrentThemeId();
    const nextId = currentId >= themeCount - 1 ? 0 : currentId + 1;
    setThemeId(nextId);
    applyTheme(nextId);
    updateButtonText(nextId);
  }

  function updateButtonText(themeId) {
    const button = document.getElementById('theme-switcher-button');
    if (button) {
      const themeName = getThemeName(themeId);
      button.setAttribute('aria-label', `Current theme: ${themeName}. Click to switch theme`);
    }
  }

  function handleThemeEditorPage() {
    const button = document.getElementById('theme-switcher-button');
    if (!button) return;

    if (isThemeEditorPage()) {
      // Hide button and reset theme on theme-editor page
      button.style.display = 'none';
      setThemeId(0);
      applyTheme(0);
    } else {
      // Show button on other pages
      button.style.display = '';
      const currentThemeId = getCurrentThemeId();
      applyTheme(currentThemeId);
      updateButtonText(currentThemeId);
    }
  }

  function initThemeSwitcher() {
    handleThemeEditorPage();
    
    const button = document.getElementById('theme-switcher-button');
    if (button && !isThemeEditorPage()) {
      button.addEventListener('click', cycleTheme);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeSwitcher);
  } else {
    initThemeSwitcher();
  }
})();