/**
 * Theme editor library - parsing and generation of theme CSS.
 *
 * Scopes for local CSS variable overrides: header, nav, article, form, button.
 * The button scope uses a multi-selector (button, .button, input[type="submit"]).
 *
 * Functions:
 * - parseThemeContent(): Parse theme SCSS into { root, scopes, bodyClasses }
 * - generateThemeCss(): Generate SCSS from controls data
 * - parseBorderValue(): Parse "2px solid #000" into components
 * - shouldIncludeScopedVar(): Check if scoped value differs from global
 *
 * Pipeline helpers for theme-editor.js UI:
 * - createFormEl(): Factory for form element selector
 * - isControlEnabled(): Check if checkbox enables the control
 * - controlToVarEntry(): Convert control to [varName, value] and apply to DOM
 * - inputToScopedEntry(): Convert scoped input to entry if differs from global
 * - collectActiveClasses(): Collect active body classes from select element
 */
import {
  compact,
  filter,
  filterMap,
  flatMap,
  join,
  map,
  pipe,
  split,
} from "#toolkit/fp/array.js";
import { fromPairs, frozenObject } from "#toolkit/fp/object.js";

export const SCOPES = ["header", "nav", "article", "form", "button"];

export const SCOPE_SELECTORS = frozenObject({
  header: "header",
  nav: "nav",
  article: "article",
  form: "form",
  button: 'button,\n.button,\ninput[type="submit"]',
});

/**
 * Parse a CSS block content (the part inside { })
 * @param {string} cssText - CSS content inside a block
 * @returns {Object} - Map of CSS variable names to values
 */
const parseCssBlock = (cssText) => {
  if (!cssText) return {};
  return pipe(
    split(";"),
    map((line) => line.match(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*(.+?)\s*$/)),
    compact,
    map((match) => [match[1], match[2]]),
    Object.fromEntries,
  )(cssText);
};

/**
 * Parse theme content from a theme.scss string
 * @param {string} themeContent - Full theme SCSS content
 * @returns {Object} - { root: {}, scopes: {}, bodyClasses: [] }
 */
export function parseThemeContent(themeContent) {
  if (!themeContent) return { root: {}, scopes: {}, bodyClasses: [] };

  const rootMatch = themeContent.match(/:root\s*\{([^}]*)\}/s);
  const classesMatch = themeContent.match(/\/\* body_classes: (.+) \*\//);

  const getScopePattern = (scope) =>
    scope === "button"
      ? /button\s*,[\s\S]*?input\[type="submit"\]\s*\{([^}]*)\}/
      : new RegExp(`(?:^|[\\s;{}])${scope}\\s*\\{([^}]*)\\}`, "s");
  const parsedScopePairs = flatMap((scope) => {
    const match = themeContent.match(getScopePattern(scope));
    return match ? [[scope, parseCssBlock(match[1])]] : [];
  })(SCOPES);

  return {
    root: rootMatch ? parseCssBlock(rootMatch[1]) : {},
    scopes: fromPairs(parsedScopePairs),
    bodyClasses: classesMatch
      ? pipe(
          split(","),
          map((s) => s.trim()),
        )(classesMatch[1])
      : [],
  };
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
      width: Number.parseInt(match[1], 10),
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
  const formatCssLine = ([varName, value]) => {
    const cssVar = varName.startsWith("--") ? varName : `--${varName}`;
    return `  ${cssVar}: ${value};`;
  };

  const rootBlock = pipe(
    Object.entries,
    map(formatCssLine),
    join("\n"),
    (lines) => `:root {\n${lines}\n}`,
  )(globalVars);

  const buildCssBlock = (selector, vars) =>
    pipe(
      Object.entries,
      map(([varName, value]) => `  ${varName}: ${value};`),
      join("\n"),
      (lines) => `${selector} {\n${lines}\n}`,
    )(vars);

  const scopeHasVars = (scopeVars) => (scope) =>
    scopeVars[scope] && Object.keys(scopeVars[scope]).length > 0;

  const scopeBlocks = filterMap(scopeHasVars(scopeVars), (scope) =>
    buildCssBlock(SCOPE_SELECTORS[scope], scopeVars[scope]),
  )(SCOPES);

  const cssOutput = pipe(
    join("\n\n"),
    (s) => `${s}\n`,
  )([rootBlock, ...scopeBlocks]);

  return bodyClasses?.length > 0
    ? `${cssOutput}\n/* body_classes: ${bodyClasses.join(", ")} */`
    : cssOutput;
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
  if (!value) return false;
  if (value === globalValue) return false;
  return true;
}

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
 * Get the computed value of a CSS custom property from an input's data-var attribute.
 * @param {CSSStyleDeclaration} docStyle - Computed style of document element
 * @param {HTMLInputElement} input - Input with data-var attribute
 * @returns {string} Trimmed CSS property value
 */
export const getCssVarValue = (docStyle, input) =>
  docStyle.getPropertyValue(input.dataset.var).trim();

/**
 * Create a function to convert color input to scoped var entry
 * @param {CSSStyleDeclaration} docStyle - Computed style of document element
 * @returns {Function} (input) => [varName, value] or null
 */
export const inputToScopedEntry = (docStyle) => (input) => {
  const globalValue = getCssVarValue(docStyle, input);
  return shouldIncludeScopedVar(input.value, globalValue)
    ? [input.dataset.var, input.value]
    : null;
};

/**
 * Toggle a body class and return the value if active
 * @param {HTMLElement} el - The select element
 * @param {boolean} enabled - Whether the control is enabled
 * @returns {Function} (value) => value or null
 */
const toggleClassAndReturn = (el, enabled) => (value) => {
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
