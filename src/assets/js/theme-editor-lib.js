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
  // Build global :root variables
  const globalLines = Object.entries(globalVars).map(([varName, value]) => {
    const cssVar = varName.startsWith("--") ? varName : `--${varName}`;
    return `  ${cssVar}: ${value};`;
  });

  const cssBlocks = [`:root {\n${globalLines.join("\n")}\n}`];

  // Add scoped blocks
  SCOPES.forEach((scope) => {
    const vars = scopeVars[scope];
    if (vars && Object.keys(vars).length > 0) {
      const selector = SCOPE_SELECTORS[scope];
      const scopeLines = Object.entries(vars)
        .map(([varName, value]) => `  ${varName}: ${value};`)
        .join("\n");
      cssBlocks.push(`${selector} {\n${scopeLines}\n}`);
    }
  });

  // Join CSS blocks with blank lines, each block ends with }
  const cssOutput = cssBlocks.join("\n\n") + "\n";

  // Add body classes comment (no trailing newline)
  if (bodyClasses && bodyClasses.length > 0) {
    return cssOutput + `\n/* body_classes: ${bodyClasses.join(", ")} */`;
  }

  return cssOutput;
}

/**
 * Check if a scoped color value should be included
 * Include the value if:
 * - It's not empty
 * - It differs from the global value for the SAME variable
 *
 * This means if header's --color-bg equals global --color-bg, we skip it (no override).
 * But if header's --color-bg is #000000 and global --color-bg is #ffffff, we include it.
 *
 * @param {string} value - The scoped value
 * @param {string} globalValue - The global value for this same variable
 * @returns {boolean}
 */
export function shouldIncludeScopedVar(value, globalValue) {
  // Don't include if value is empty
  if (!value) return false;
  // Don't include if same as global (no override needed)
  if (value === globalValue) return false;
  return true;
}

/**
 * Collect scope variables from form data, filtering out values that match global
 * @param {Object} scopeFormData - Form values for this scope { varName: value }
 * @param {Object} globalValues - Global values for comparison { varName: value }
 * @returns {Object} - Filtered scope variables (only those differing from global)
 */
export function filterScopeVars(scopeFormData, globalValues = {}) {
  const vars = {};

  Object.entries(scopeFormData).forEach(([varName, value]) => {
    const globalValue = globalValues[varName];
    if (shouldIncludeScopedVar(value, globalValue)) {
      vars[varName] = value;
    }
  });

  return vars;
}
