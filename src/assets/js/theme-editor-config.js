// Theme Editor Configuration
// This file defines all inputs in a data-driven way for easier testing

/**
 * Global inputs that appear in :root {}
 * These are the "Defaults" and "Fonts" tabs
 */
export const GLOBAL_INPUTS = {
  // Colors tab
  "color-bg": { type: "color", label: "Background", tab: "default" },
  "color-text": { type: "color", label: "Text", tab: "default" },
  "color-link": { type: "color", label: "Links", tab: "default" },
  "color-link-hover": { type: "color", label: "Link Hover", tab: "default" },

  // Layout tab
  "border-radius": {
    type: "number",
    label: "Border Radius",
    tab: "default",
    suffix: "px",
  },
  border: { type: "border", label: "Border", tab: "default" },
  "box-shadow": { type: "text", label: "Box Shadow", tab: "default" },
  "width-content": { type: "text", label: "Content Width", tab: "default" },
  "width-card": { type: "text", label: "Card Width", tab: "default" },
  "width-card-medium": {
    type: "text",
    label: "Medium Card Width",
    tab: "default",
  },
  "width-card-wide": { type: "text", label: "Wide Card Width", tab: "default" },

  // Fonts tab
  "font-family-heading": {
    type: "select",
    label: "Headings",
    tab: "fonts",
    options: "fonts",
  },
  "font-family-body": {
    type: "select",
    label: "Body",
    tab: "fonts",
    options: "fonts",
  },
  "line-height": {
    type: "number",
    label: "Line Height",
    tab: "fonts",
    step: 0.1,
  },
  "link-decoration": {
    type: "select",
    label: "Link Decoration",
    tab: "fonts",
    options: "text-decoration",
  },
  "link-decoration-hover": {
    type: "select",
    label: "Link Decoration (hover)",
    tab: "fonts",
    options: "text-decoration",
  },
  "link-decoration-style": {
    type: "select",
    label: "Link Decoration Style",
    tab: "fonts",
    options: "line-styles",
  },
};

/**
 * Scoped inputs that appear in element {} blocks
 * Each scope (header, nav, article, form, button) has these inputs
 */
export const SCOPED_INPUTS = {
  "color-bg": { type: "color", label: "Background" },
  "color-text": { type: "color", label: "Text" },
  "color-link": { type: "color", label: "Links" },
  "color-link-hover": { type: "color", label: "Link Hover" },
  border: { type: "border", label: "Border" },
};

/**
 * Scope definitions with their CSS selectors and extra inputs
 */
export const SCOPE_DEFINITIONS = {
  header: {
    selector: "header",
    label: "Header",
    tab: "header",
    extraInputs: {
      "header-decoration": {
        type: "select-class",
        label: "Header Style",
        options: "header-decorations",
      },
    },
  },
  nav: {
    selector: "nav",
    label: "Navigation",
    tab: "nav",
    extraInputs: {},
  },
  article: {
    selector: "article",
    label: "Article/Main Content",
    tab: "main",
    extraInputs: {
      "main-heading-decoration": {
        type: "select-class",
        label: "Heading Style",
        options: "heading-decorations",
      },
    },
  },
  form: {
    selector: "form",
    label: "Form",
    tab: "form",
    extraInputs: {},
  },
  button: {
    selector: 'button,\n.button,\ninput[type="submit"]',
    label: "Button",
    tab: "form",
    extraInputs: {},
  },
};

/**
 * Get all input IDs for a specific scope
 */
export function getScopedInputIds(scope) {
  return Object.keys(SCOPED_INPUTS).map((id) => `${scope}-${id}`);
}

/**
 * Get all global input IDs
 */
export function getGlobalInputIds() {
  return Object.keys(GLOBAL_INPUTS);
}

/**
 * Get all scopes
 */
export function getScopes() {
  return Object.keys(SCOPE_DEFINITIONS);
}

/**
 * Get the CSS selector for a scope
 */
export function getScopeSelector(scope) {
  return SCOPE_DEFINITIONS[scope]?.selector || scope;
}

/**
 * Get the list of CSS variable names that can be scoped
 */
export function getScopedVarNames() {
  return Object.keys(SCOPED_INPUTS).map((id) => `--${id}`);
}

/**
 * Total count of inputs for testing
 */
export function getInputCounts() {
  const globalCount = Object.keys(GLOBAL_INPUTS).length;
  const scopedPerScope = Object.keys(SCOPED_INPUTS).length;
  const scopes = Object.keys(SCOPE_DEFINITIONS).length;
  const extraInputs = Object.values(SCOPE_DEFINITIONS).reduce(
    (sum, def) => sum + Object.keys(def.extraInputs).length,
    0,
  );

  return {
    global: globalCount,
    scopedPerScope,
    scopes,
    totalScoped: scopedPerScope * scopes,
    extraInputs,
    total: globalCount + scopedPerScope * scopes + extraInputs,
  };
}
