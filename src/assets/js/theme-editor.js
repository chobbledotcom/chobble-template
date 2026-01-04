import { onReady } from "#assets/on-ready.js";
import {
  collectActiveClasses,
  controlToVarEntry,
  createFormEl,
  generateThemeCss,
  inputToScopedEntry,
  isControlEnabled,
  parseBorderValue,
  parseThemeContent,
  SCOPES,
  shouldIncludeScopedVar,
} from "#assets/theme-editor-lib.js";
import { compact, filter, flatMap, map, pipe } from "#utils/array-utils.js";

const ELEMENT_IDS = {
  form: "theme-editor-form",
  output: "theme-output",
  download: "download-theme",
};

// DOM selectors for applying scoped variables
const SCOPE_DOM_SELECTORS = {
  header: "header",
  nav: "nav",
  article: "article",
  form: "form",
  button: "button, .button, input[type='submit']",
};

// CSS variables to clear when applying scoped styles
const SCOPED_VARS_TO_CLEAR = [
  "--color-bg",
  "--color-text",
  "--color-link",
  "--color-link-hover",
  "--border",
];

const applyScopeToElement = (el, vars) => {
  for (const varName of SCOPED_VARS_TO_CLEAR) {
    el.style.removeProperty(varName);
  }
  for (const [varName, value] of Object.entries(vars)) {
    el.style.setProperty(varName, value);
  }
};

// Create form element selector for this form
const formEl = createFormEl(ELEMENT_IDS.form);

const ThemeEditor = {
  initialized: false,

  /**
   * Apply parsed border values to border control inputs
   * @param {Object} parsed - Parsed border object with width, style, color
   * @param {HTMLInputElement} widthInput - Width number input
   * @param {HTMLSelectElement} styleSelect - Style select element
   * @param {HTMLInputElement} colorInput - Color picker input
   */
  applyBorderToInputs(parsed, widthInput, styleSelect, colorInput) {
    if (!parsed || !widthInput || !styleSelect || !colorInput) return;
    widthInput.value = parsed.width;
    styleSelect.value = parsed.style;
    if (parsed.color.startsWith("#")) colorInput.value = parsed.color;
  },

  /**
   * Get the value for a CSS variable from rootVars or computed style
   * @param {string} varName - CSS variable name (e.g., "--color-bg")
   * @param {Object} rootVars - Object of parsed root variables
   * @param {Object} options - Options object
   * @param {string} options.type - "number" to parse as float, otherwise string
   * @param {string} options.fallback - Fallback value if no value found
   * @returns {string|number} The value for the control
   */
  getControlValue(varName, rootVars, options = {}) {
    const { type, fallback } = options;
    if (rootVars[varName]) {
      return type === "number"
        ? parseFloat(rootVars[varName]) || 0
        : rootVars[varName];
    }
    const computed = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    if (type === "number") return parseFloat(computed) || 0;
    return computed || fallback || "";
  },

  init() {
    // Only run on theme-editor page
    if (!document.getElementById(ELEMENT_IDS.form)) return;
    if (!document.getElementById(ELEMENT_IDS.output)) return;

    // Skip if already initialized
    if (this.initialized) return;
    this.initialized = true;

    this.initTabNavigation();
    this.initControlsFromTheme();
    this.setupEventListeners();
  },

  formQuery(selector) {
    return document.querySelectorAll(`#${ELEMENT_IDS.form} ${selector}`);
  },

  initTabNavigation() {
    for (const tabLink of document.querySelectorAll(".tab-link")) {
      tabLink.addEventListener("click", (e) => {
        e.preventDefault();
        for (const link of document.querySelectorAll(".tab-link")) {
          link.classList.remove("active");
        }
        for (const content of document.querySelectorAll(".tab-content")) {
          content.classList.remove("active");
        }
        tabLink.classList.add("active");
        document
          .getElementById(`${tabLink.dataset.tab}-tab`)
          .classList.add("active");
      });
    }
  },

  initControlsFromTheme() {
    const parsed = parseThemeContent(
      document.getElementById(ELEMENT_IDS.output).value,
    );

    // Initialize global :root variables
    this.initGlobalControls(parsed.root);

    // Initialize scoped controls - ALWAYS init all scopes to attach event listeners
    for (const scope of SCOPES) {
      this.initScopedControls(scope, parsed.scopes[scope] || {});
    }

    // Apply initial scoped values to DOM for live preview
    this.applyScopes(parsed.scopes);

    // Initialize body classes
    for (const cssClass of parsed.bodyClasses) {
      document.body.classList.add(cssClass);
    }

    // Initialize select-class controls
    this.initSelectClassControls();

    // Set up checkbox controls for global variables
    this.initCheckboxControls(parsed.root);
  },

  initGlobalControls(rootVars) {
    // Apply variables to document and initialize controls
    for (const [varName, value] of Object.entries(rootVars)) {
      document.documentElement.style.setProperty(varName, value);
    }

    // Initialize color controls
    for (const input of this.formQuery(
      'input[type="color"][data-var]:not([data-scope])',
    )) {
      input.value = this.getControlValue(input.dataset.var, rootVars, {
        fallback: "#000000",
      });
      input.addEventListener("input", () => this.updateThemeFromControls());
    }

    // Initialize text controls
    for (const input of this.formQuery(
      'input[type="text"][data-var]:not([data-scope])',
    )) {
      if (input.id.includes("border")) continue; // Skip border hidden inputs
      input.value = this.getControlValue(input.dataset.var, rootVars);
      input.addEventListener("input", () => this.updateThemeFromControls());
    }

    // Initialize select controls
    for (const input of this.formQuery("select[data-var]:not([data-scope])")) {
      input.value = this.getControlValue(input.dataset.var, rootVars);
      input.addEventListener("input", () => this.updateThemeFromControls());
    }

    // Initialize number controls
    for (const input of this.formQuery(
      'input[type="number"][data-var]:not([data-scope])',
    )) {
      input.value = this.getControlValue(input.dataset.var, rootVars, {
        type: "number",
      });
      input.addEventListener("input", () => this.updateThemeFromControls());
    }

    // Initialize border controls for global border
    this.initBorderControl("", rootVars["--border"]);
  },

  initScopedControls(scope, scopeVars) {
    const docStyle = getComputedStyle(document.documentElement);

    // Initialize color controls for this scope
    // IMPORTANT: Must initialize to global values, not browser default #000000
    // Otherwise unchanged inputs pollute output (see test: browser-default-black-should-not-pollute-output)
    // Require [data-var] to exclude border-color inputs (which don't represent CSS vars)
    for (const input of this.formQuery(
      `input[type="color"][data-var][data-scope="${scope}"]`,
    )) {
      const varName = input.dataset.var;
      if (scopeVars[varName]) {
        // Use value from parsed theme
        input.value = scopeVars[varName];
      } else {
        // Initialize to GLOBAL value so unchanged inputs don't pollute output
        // Browser color inputs default to #000000 which would differ from global
        const globalValue = docStyle.getPropertyValue(varName).trim();
        if (globalValue?.startsWith("#")) {
          input.value = globalValue;
        }
      }
      input.addEventListener("input", () => this.updateThemeFromControls());
    }

    // Initialize border for this scope
    this.initBorderControl(scope, scopeVars["--border"]);
  },

  /**
   * Initialize border controls for global or scoped borders
   * @param {string} scope - Empty string for global, or scope name (e.g., "header")
   * @param {string} borderValue - The border value from the theme
   */
  initBorderControl(scope, borderValue) {
    const idPrefix = scope ? `${scope}-` : "";
    const isGlobal = !scope;

    const widthInput = formEl(`${idPrefix}border-width`);
    const styleSelect = formEl(`${idPrefix}border-style`);
    const colorInput = formEl(`${idPrefix}border-color`);
    const outputInput = formEl(`${idPrefix}border`);

    if (!widthInput || !styleSelect || !colorInput) return;

    // Parse provided value or fall back to global computed value
    const parsed =
      parseBorderValue(borderValue) ||
      parseBorderValue(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--border")
          .trim(),
      );

    this.applyBorderToInputs(parsed, widthInput, styleSelect, colorInput);

    if (outputInput) {
      outputInput.value = `${widthInput.value}px ${styleSelect.value} ${colorInput.value}`;
    }

    const updateBorder = () => {
      const borderVal = `${widthInput.value}px ${styleSelect.value} ${colorInput.value}`;
      if (outputInput) outputInput.value = borderVal;
      // Only apply to document root for global border
      if (isGlobal) {
        document.documentElement.style.setProperty("--border", borderVal);
      }
      this.updateThemeFromControls();
    };

    widthInput.addEventListener("input", updateBorder);
    styleSelect.addEventListener("change", updateBorder);
    colorInput.addEventListener("input", updateBorder);
  },

  initSelectClassControls() {
    for (const input of this.formQuery("select[data-class]")) {
      for (const o of input.querySelectorAll("option")) {
        if (document.body.classList.contains(o.value)) input.value = o.value;
      }
      input.addEventListener("input", () => this.updateThemeFromControls());
    }
  },

  initCheckboxControls(rootVars) {
    for (const checkbox of document.querySelectorAll(
      'input[type="checkbox"][data-target]',
    )) {
      const targetIds = checkbox.dataset.target.split(",");
      const id = checkbox.id.replace(/-enabled$/, "");
      const hasRootVar = rootVars[`--${id}`] !== undefined;
      const hasActiveClass = Array.from(
        formEl(`${id}[data-class]`)?.querySelectorAll("option") || [],
      ).some(
        (opt) =>
          opt.value !== "" && document.body.classList.contains(opt.value),
      );
      const isEnabled = hasRootVar || hasActiveClass;

      checkbox.checked = isEnabled;
      for (const tid of targetIds) {
        this.toggleCheckbox(tid, isEnabled);
      }

      checkbox.addEventListener("change", () => {
        for (const tid of targetIds) {
          this.toggleCheckbox(tid, checkbox.checked);
        }
        this.updateThemeFromControls();
      });
    }
  },

  toggleCheckbox(id, checked) {
    const target = formEl(id);
    if (!target) return;
    if (checked) {
      target.disabled = false;
      target.style.removeProperty("display");
    } else {
      target.disabled = true;
      target.style.display = "none";
      document.documentElement.style.removeProperty(`--${id}`);
    }
  },

  setupEventListeners() {
    document
      .getElementById(ELEMENT_IDS.download)
      .addEventListener("click", () => this.downloadTheme());
    document
      .getElementById(ELEMENT_IDS.output)
      .addEventListener("input", () => this.initControlsFromTheme());
  },

  /**
   * Apply scoped CSS variables to DOM elements for live preview
   */
  applyScopes(scopeVars) {
    for (const scope of SCOPES) {
      const selector = SCOPE_DOM_SELECTORS[scope];
      const elements = document.querySelectorAll(selector);
      const vars = scopeVars[scope] || {};

      for (const el of elements) {
        applyScopeToElement(el, vars);
      }
    }
  },

  updateThemeFromControls() {
    // Read previous global values from textarea for cascade comparison
    const oldGlobalVars = parseThemeContent(
      document.getElementById(ELEMENT_IDS.output).value,
    ).root;

    // Collect global :root variables
    const globalVars = pipe(
      Array.from,
      filter(isControlEnabled(formEl)),
      map(controlToVarEntry),
      Object.fromEntries,
    )(this.formQuery("[data-var]:not([data-scope])"));

    // Cascade global changes to scoped inputs that were "following" the old global value
    // This prevents unchanged scoped inputs from appearing as overrides when global changes
    this.cascadeGlobalChangesToScopes(oldGlobalVars, globalVars);

    // Collect scoped variables
    const scopeVars = pipe(
      map((scope) => [scope, this.collectScopeVars(scope)]),
      filter(([, vars]) => Object.keys(vars).length > 0),
      Object.fromEntries,
    )(SCOPES);

    // Apply scoped variables to DOM for live preview
    this.applyScopes(scopeVars);

    // Handle body classes - toggle DOM classes and collect active ones
    const bodyClasses = pipe(
      Array.from,
      flatMap(collectActiveClasses(formEl)),
    )(this.formQuery("[data-class]"));

    // Generate CSS and write to textarea
    const themeText = generateThemeCss(globalVars, scopeVars, bodyClasses);
    document.getElementById(ELEMENT_IDS.output).value = themeText;
  },

  // Update color inputs that were following old global value
  cascadeColorInputs(scope, oldGlobalVars, newGlobalVars) {
    for (const input of this.formQuery(
      `input[type="color"][data-var][data-scope="${scope}"]`,
    )) {
      const varName = input.dataset.var;
      const oldGlobal = oldGlobalVars[varName];
      const newGlobal = newGlobalVars[varName];
      if (oldGlobal && newGlobal && input.value === oldGlobal) {
        input.value = newGlobal;
      }
    }
  },

  // Update border inputs that were following old global value
  cascadeBorderInputs(scope, oldGlobalVars, newGlobalVars) {
    const borderOutput = formEl(`${scope}-border`);
    if (!borderOutput) return;

    const oldGlobalBorder = oldGlobalVars["--border"];
    const newGlobalBorder = newGlobalVars["--border"];
    if (!oldGlobalBorder || !newGlobalBorder) return;
    if (borderOutput.value !== oldGlobalBorder) return;

    const widthInput = formEl(`${scope}-border-width`);
    const styleSelect = formEl(`${scope}-border-style`);
    const colorInput = formEl(`${scope}-border-color`);
    const parsed = parseBorderValue(newGlobalBorder);
    this.applyBorderToInputs(parsed, widthInput, styleSelect, colorInput);
    borderOutput.value = newGlobalBorder;
  },

  /**
   * Cascade global value changes to scoped inputs that were "following" the old global value.
   * This prevents unchanged scoped inputs from appearing as overrides when global changes.
   */
  cascadeGlobalChangesToScopes(oldGlobalVars, newGlobalVars) {
    for (const scope of SCOPES) {
      this.cascadeColorInputs(scope, oldGlobalVars, newGlobalVars);
      this.cascadeBorderInputs(scope, oldGlobalVars, newGlobalVars);
    }
  },

  collectScopeVars(scope) {
    const docStyle = getComputedStyle(document.documentElement);

    // Color inputs for this scope - compare against global value for same var
    // Require [data-var] to exclude border-color inputs (which don't represent CSS vars)
    const colorVars = pipe(
      Array.from,
      map(inputToScopedEntry(docStyle)),
      compact,
      Object.fromEntries,
    )(this.formQuery(`input[type="color"][data-var][data-scope="${scope}"]`));

    // Border for this scope - include if different from global border
    const borderOutput = formEl(`${scope}-border`);
    const globalBorder = docStyle.getPropertyValue("--border").trim();
    const borderVar =
      borderOutput?.value &&
      shouldIncludeScopedVar(borderOutput.value, globalBorder)
        ? { "--border": borderOutput.value }
        : {};

    return { ...colorVars, ...borderVar };
  },

  downloadTheme() {
    const content = document.getElementById(ELEMENT_IDS.output).value;
    const blob = new Blob([content], { type: "text/css" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "theme.scss";
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },
};

function init() {
  ThemeEditor.init.call(ThemeEditor);
}

onReady(init);
