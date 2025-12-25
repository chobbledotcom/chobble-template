// Pure functions for theme editor - can be tested without DOM

// Scopes that support local CSS variable overrides
export const SCOPES = ["header", "nav", "article", "form", "button"];

// The button selector needs special handling for CSS output
export const SCOPE_SELECTORS = {
  header: "header",
  nav: "nav",
  article: "article",
  form: "form",
  button: 'button,\n.button,\ninput[type="submit"]',
};

/**
 * Parse a CSS block content (the part inside { })
 * @param {string} cssText - CSS content inside a block
 * @returns {Object} - Map of CSS variable names to values
 */
export function parseCssBlock(cssText) {
  if (!cssText) return {};
  const vars = {};
  cssText.split(";").forEach((line) => {
    const match = line.match(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*(.+?)\s*$/);
    if (match) {
      vars[match[1]] = match[2];
    }
  });
  return vars;
}

/**
 * Parse theme content from a theme.scss string
 * @param {string} themeContent - Full theme SCSS content
 * @returns {Object} - { root: {}, scopes: {}, bodyClasses: [] }
 */
export function parseThemeContent(themeContent) {
  const result = {
    root: {},
    scopes: {},
    bodyClasses: [],
  };

  if (!themeContent) return result;

  // Parse :root block
  const rootMatch = themeContent.match(/:root\s*\{([^}]*)\}/s);
  if (rootMatch) {
    result.root = parseCssBlock(rootMatch[1]);
  }

  // Parse scoped blocks (header, nav, article, form, button)
  SCOPES.forEach((scope) => {
    let pattern;
    if (scope === "button") {
      // Handle button which might be multi-line selector
      pattern = /button\s*,[\s\S]*?input\[type="submit"\]\s*\{([^}]*)\}/;
    } else {
      pattern = new RegExp(`(?:^|[\\s;{}])${scope}\\s*\\{([^}]*)\\}`, "s");
    }
    const match = themeContent.match(pattern);
    if (match) {
      result.scopes[scope] = parseCssBlock(match[1]);
    }
  });

  // Parse body_classes comment
  const classesMatch = themeContent.match(/\/\* body_classes: (.+) \*\//);
  if (classesMatch) {
    result.bodyClasses = classesMatch[1].split(",").map((s) => s.trim());
  }

  return result;
}

/**
 * Parse border value string into components
 * @param {string} borderValue - e.g. "2px solid #000000"
 * @returns {Object|null} - { width, style, color } or null if invalid
 */
export function parseBorderValue(borderValue) {
  if (!borderValue) return null;
  const match = borderValue.match(/(\d+)px\s+(\w+)\s+(.+)/);
  if (match && match.length === 4) {
    return {
      width: parseInt(match[1], 10),
      style: match[2],
      color: match[3],
    };
  }
  return null;
}

/**
 * Generate theme CSS from controls data
 * @param {Object} globalVars - Global :root CSS variables { varName: value }
 * @param {Object} scopeVars - Scoped variables { scope: { varName: value } }
 * @param {Array} bodyClasses - Array of body class names
 * @returns {string} - Generated theme CSS
 */
export function generateThemeCss(globalVars, scopeVars, bodyClasses) {
  let themeText = ":root {\n";

  // Add global variables
  Object.entries(globalVars).forEach(([varName, value]) => {
    // Ensure variable name has -- prefix
    const cssVar = varName.startsWith("--") ? varName : `--${varName}`;
    themeText += `  ${cssVar}: ${value};\n`;
  });

  themeText += "}\n";

  // Add scoped blocks
  SCOPES.forEach((scope) => {
    const vars = scopeVars[scope];
    if (vars && Object.keys(vars).length > 0) {
      const selector = SCOPE_SELECTORS[scope];
      themeText += `\n${selector} {\n`;
      Object.entries(vars).forEach(([varName, value]) => {
        themeText += `  ${varName}: ${value};\n`;
      });
      themeText += "}\n";
    }
  });

  // Add body classes comment
  if (bodyClasses && bodyClasses.length > 0) {
    themeText += `\n/* body_classes: ${bodyClasses.join(", ")} */`;
  }

  return themeText;
}

/**
 * Check if a scoped variable should be included (differs from default)
 * @param {string} value - The scoped value
 * @param {string} defaultValue - The default/global value
 * @returns {boolean}
 */
export function shouldIncludeScopedVar(value, defaultValue) {
  // Don't include if value is empty, black (#000000), or same as default
  if (!value) return false;
  if (value === "#000000") return false;
  if (value === defaultValue) return false;
  return true;
}

/**
 * Collect scope variables from form data, filtering out defaults
 * @param {Object} scopeFormData - Form values for this scope { varName: value }
 * @param {Object} globalDefaults - Global default values { varName: value }
 * @returns {Object} - Filtered scope variables
 */
export function collectScopeVarsFromFormData(scopeFormData, globalDefaults) {
  const vars = {};

  Object.entries(scopeFormData).forEach(([varName, value]) => {
    const defaultValue = globalDefaults[varName];
    if (shouldIncludeScopedVar(value, defaultValue)) {
      vars[varName] = value;
    }
  });

  return vars;
}
