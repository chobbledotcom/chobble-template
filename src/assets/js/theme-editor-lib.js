// Functions for theme editor - can be tested with DOM mocking

import { compact, filter, map, pipe, split } from "#utils/array-utils.js";
import { filterObject } from "#utils/object-entries.js";

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
  return pipe(
    split(";"),
    map((line) => line.match(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*(.+?)\s*$/)),
    compact,
    map((match) => [match[1], match[2]]),
    Object.fromEntries,
  )(cssText);
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
    // Button has a multi-line selector, other scopes use a simple pattern
    const pattern =
      scope === "button"
        ? /button\s*,[\s\S]*?input\[type="submit"\]\s*\{([^}]*)\}/
        : new RegExp(`(?:^|[\\s;{}])${scope}\\s*\\{([^}]*)\\}`, "s");
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
  const cssOutput = `${cssBlocks.join("\n\n")}\n`;

  // Add body classes comment (no trailing newline)
  if (bodyClasses && bodyClasses.length > 0) {
    return `${cssOutput}\n/* body_classes: ${bodyClasses.join(", ")} */`;
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
export const filterScopeVars = (scopeFormData, globalValues = {}) =>
  filterObject((varName, value) =>
    shouldIncludeScopedVar(value, globalValues[varName]),
  )(scopeFormData);

// Pipeline helpers for theme editor UI

/**
 * Create a form element selector for a given form ID
 * @param {string} formId - The form element ID
 * @returns {Function} (id) => element or null
 */
export const createFormEl = (formId) => (id) =>
  document.querySelector(`#${formId} #${id}`);

/**
 * Check if a control is enabled (no checkbox or checkbox is checked)
 * @param {Function} formEl - Form element selector function
 * @returns {Function} (input) => boolean
 */
export const isControlEnabled = (formEl) => (input) => {
  const checkbox = formEl(`${input.id}-enabled`);
  return !checkbox || checkbox.checked;
};

/**
 * Convert a form control to a CSS variable entry and apply to document
 * @param {HTMLElement} el - The form control element
 * @returns {Array} [varName, value] tuple
 */
export const controlToVarEntry = (el) => {
  const value = el.id === "border-radius" ? `${el.value}px` : el.value;
  const varName = `--${el.id}`;
  document.documentElement.style.setProperty(varName, value);
  return [varName, value];
};

/**
 * Create a function to convert color input to scoped var entry
 * @param {CSSStyleDeclaration} docStyle - Computed style of document element
 * @returns {Function} (input) => [varName, value] or null
 */
export const inputToScopedEntry = (docStyle) => (input) => {
  const varName = input.dataset.var;
  const value = input.value;
  const globalValue = docStyle.getPropertyValue(varName).trim();
  return shouldIncludeScopedVar(value, globalValue) ? [varName, value] : null;
};

/**
 * Toggle a body class and return the value if active
 * @param {HTMLElement} el - The select element
 * @param {boolean} enabled - Whether the control is enabled
 * @returns {Function} (value) => value or null
 */
export const toggleClassAndReturn = (el, enabled) => (value) => {
  const isActive = value === el.value && enabled;
  document.body.classList.toggle(value, isActive);
  return isActive ? value : null;
};

/**
 * Collect active class values from a select element
 * @param {Function} formEl - Form element selector function
 * @returns {Function} (el) => array of active class names
 */
export const collectActiveClasses = (formEl) => (el) => {
  const enabled = isControlEnabled(formEl)(el);
  return pipe(
    Array.from,
    map((o) => o.value),
    filter((v) => v !== ""),
    map(toggleClassAndReturn(el, enabled)),
    compact,
  )(el.querySelectorAll("option"));
};
