(function() {
  function isThemeEditorPage() {
    return window.location.pathname.includes('/theme-editor/');
  }

  function getThemeList() {
    const computed = getComputedStyle(document.documentElement);
    const themeListStr = computed.getPropertyValue('--theme-list').trim();
    if (themeListStr) {
      // Remove quotes and split by comma
      return themeListStr.replace(/['"]/g, '').split(',');
    }
    // Fallback to a default list if CSS variable not found
    return ['default'];
  }

  function getThemeDisplayName(themeName) {
    const computed = getComputedStyle(document.documentElement);
    const displayName = computed.getPropertyValue(`--theme-${themeName}-name`).trim();
    return displayName ? displayName.replace(/['"]/g, '') : themeName;
  }

  function getCurrentTheme() {
    const stored = localStorage.getItem('theme_name');
    return stored || 'default';
  }

  function setCurrentTheme(themeName) {
    localStorage.setItem('theme_name', themeName);
  }

  const themeFonts = {
    'floral': 'princess-sofia:400',
    'hacker': 'share-tech-mono:400',
    'neon': 'orbitron:600'
  };

  function loadFontForTheme(themeName) {
    const fontLinkId = 'theme-font-link';
    let fontLink = document.getElementById(fontLinkId);
    
    // Remove existing font link if present
    if (fontLink) {
      fontLink.remove();
    }
    
    // Add font link if theme has a custom font
    if (themeFonts[themeName]) {
      fontLink = document.createElement('link');
      fontLink.id = fontLinkId;
      fontLink.rel = 'stylesheet';
      fontLink.href = `https://fonts.bunny.net/css?family=${themeFonts[themeName]}`;
      document.head.appendChild(fontLink);
    }
  }

  function applyTheme(themeName) {
    if (themeName === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeName);
    }
    loadFontForTheme(themeName);
  }

  function cycleTheme() {
    const themes = getThemeList();
    const currentTheme = getCurrentTheme();
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    
    setCurrentTheme(nextTheme);
    applyTheme(nextTheme);
    updateButtonText(nextTheme);
  }

  function updateButtonText(themeName) {
    const button = document.getElementById('theme-switcher-button');
    if (button) {
      const displayName = getThemeDisplayName(themeName);
      button.setAttribute('aria-label', `Current theme: ${displayName}. Click to switch theme`);
    }
  }

  function handleThemeEditorPage() {
    const button = document.getElementById('theme-switcher-button');
    if (!button) return;

    if (isThemeEditorPage()) {
      // Hide button and reset theme on theme-editor page
      button.style.display = 'none';
      setCurrentTheme('default');
      applyTheme('default');
    } else {
      // Show button on other pages
      button.style.display = '';
      const currentTheme = getCurrentTheme();
      applyTheme(currentTheme);
      updateButtonText(currentTheme);
    }
  }

  function initThemeSwitcher() {
    handleThemeEditorPage();
    
    const button = document.getElementById('theme-switcher-button');
    if (button && !isThemeEditorPage()) {
      button.addEventListener('click', cycleTheme);
    }
  }

  // Migrate old integer-based theme storage to new name-based system
  function migrateOldThemeStorage() {
    const oldThemeId = localStorage.getItem('theme_id');
    if (oldThemeId !== null) {
      // Map old IDs to new theme names based on old alphabetical order
      const oldMapping = {
        '0': 'default',
        '1': '90s-computer',
        '2': 'floral',
        '3': 'hacker',
        '4': 'monochrome',
        '5': 'neon',
        '6': 'ocean',
        '7': 'old-mac',
        '8': 'rainbow',
        '9': 'sunset'
      };
      const newThemeName = oldMapping[oldThemeId] || 'default';
      setCurrentTheme(newThemeName);
      localStorage.removeItem('theme_id'); // Clean up old storage
    }
  }

  // Run migration on load
  migrateOldThemeStorage();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeSwitcher);
  } else {
    initThemeSwitcher();
  }
})();