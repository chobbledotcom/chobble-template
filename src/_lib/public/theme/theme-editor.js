/**
 * Theme editor - live CSS variable editor with scoped styling support.
 *
 * Provides interactive controls for customizing theme colors, borders, and body
 * classes. Changes are applied immediately to the DOM for live preview and
 * exported as SCSS for download.
 *
 * Architecture:
 * - Global controls: Edit :root CSS variables applied to document.documentElement
 * - Scoped controls: Override variables for specific elements (header, nav, etc.)
 * - Cascading: When global values change, scoped inputs "following" the old value update
 * - Body classes: Toggle CSS classes on document.body via select controls
 *
 * DOM selectors for scoped variables:
 * - header: "header"
 * - nav: "nav"
 * - article: "article"
 * - form: "form"
 * - button: "button, .button, input[type='submit']"
 *
 * CSS variables cleared when applying scoped styles:
 * --color-bg, --color-text, --color-link, --color-link-hover, --border
 */
import {
  collectActiveClasses,
  controlToVarEntry,
  createFormEl,
  generateThemeCss,
  getCssVarValue,
  inputToScopedEntry,
  isControlEnabled,
  parseBorderValue,
  parseThemeContent,
  SCOPE_SELECTORS,
  SCOPES,
  shouldIncludeScopedVar,
} from "#public/theme/theme-editor-lib.js";
import { onReady } from "#public/utils/on-ready.js";
import { compact, filter, flatMap, map, pipe } from "#toolkit/fp/array.js";
import { frozenObject } from "#toolkit/fp/object.js";

const ELEMENT_IDS = frozenObject({
  form: "theme-editor-form",
  output: "theme-output",
  download: "download-theme",
});

const SCOPED_VARS_TO_CLEAR = [
  "--color-bg",
  "--color-text",
  "--color-link",
  "--color-link-hover",
  "--border",
];

const formEl = createFormEl(ELEMENT_IDS.form);

const formatBorderValue = (widthInput, styleSelect, colorInput) =>
  `${widthInput.value}px ${styleSelect.value} ${colorInput.value}`;

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
    const parseValue = (val) =>
      options.type === "number" ? Number.parseFloat(val) || 0 : val;
    if (rootVars[varName]) return parseValue(rootVars[varName]);
    const computed = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    return computed
      ? parseValue(computed)
      : options.fallback || (options.type === "number" ? 0 : "");
  },

  init() {
    if (!document.getElementById(ELEMENT_IDS.form)) return;
    if (!document.getElementById(ELEMENT_IDS.output)) return;
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

    this.initGlobalControls(parsed.root);
    this.initAllScopedControls(parsed.scopes);
    this.applyScopes(parsed.scopes);

    for (const cssClass of parsed.bodyClasses) {
      document.body.classList.add(cssClass);
    }

    this.initSelectClassControls();
    this.initCheckboxControls(parsed.root);
  },

  initControlInputs(selector, rootVars, options = {}) {
    const updateHandler = () => this.updateThemeFromControls();
    for (const input of this.formQuery(selector)) {
      if (options.skipBorder && input.id.includes("border")) continue;
      input.value = this.getControlValue(input.dataset.var, rootVars, options);
      input.addEventListener("input", updateHandler);
    }
  },

  initGlobalControls(rootVars) {
    for (const [varName, value] of Object.entries(rootVars)) {
      document.documentElement.style.setProperty(varName, value);
    }
    this.initControlInputs(
      'input[type="color"][data-var]:not([data-scope])',
      rootVars,
      { fallback: "#000000" },
    );
    this.initControlInputs(
      'input[type="text"][data-var]:not([data-scope])',
      rootVars,
      { skipBorder: true },
    );
    this.initControlInputs("select[data-var]:not([data-scope])", rootVars);
    this.initControlInputs(
      'input[type="number"][data-var]:not([data-scope])',
      rootVars,
      { type: "number" },
    );
    this.initBorderControl("", rootVars["--border"]);
  },

  bindThemeUpdate(input) {
    input.addEventListener("input", () => this.updateThemeFromControls());
  },

  initScopedColorInput(input, scopeVars, docStyle) {
    if (scopeVars[input.dataset.var]) {
      input.value = scopeVars[input.dataset.var];
    } else {
      const globalValue = getCssVarValue(docStyle, input);
      if (globalValue?.startsWith("#")) input.value = globalValue;
    }
    this.bindThemeUpdate(input);
  },

  initScopedControls(scope, scopeVars) {
    const docStyle = getComputedStyle(document.documentElement);
    const selector = `input[type="color"][data-var][data-scope="${scope}"]`;
    for (const input of this.formQuery(selector)) {
      this.initScopedColorInput(input, scopeVars, docStyle);
    }
    this.initBorderControl(scope, scopeVars["--border"]);
  },

  initAllScopedControls(parsedScopes) {
    for (const scope of SCOPES) {
      this.initScopedControls(scope, parsedScopes[scope] || {});
    }
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

    const parsed =
      parseBorderValue(borderValue) ||
      parseBorderValue(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--border")
          .trim(),
      );

    this.applyBorderToInputs(parsed, widthInput, styleSelect, colorInput);

    if (outputInput) {
      outputInput.value = formatBorderValue(
        widthInput,
        styleSelect,
        colorInput,
      );
    }

    const updateBorder = () => {
      const borderVal = formatBorderValue(widthInput, styleSelect, colorInput);
      if (outputInput) outputInput.value = borderVal;
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
      this.bindThemeUpdate(input);
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
    const applyScopeToElement = (el, vars) => {
      for (const varName of SCOPED_VARS_TO_CLEAR) {
        el.style.removeProperty(varName);
      }
      for (const [varName, value] of Object.entries(vars)) {
        el.style.setProperty(varName, value);
      }
    };

    for (const scope of SCOPES) {
      const selector = SCOPE_SELECTORS[scope];
      const elements = document.querySelectorAll(selector);
      const vars = scopeVars[scope] || {};

      for (const el of elements) {
        applyScopeToElement(el, vars);
      }
    }
  },

  updateThemeFromControls() {
    const oldGlobalVars = parseThemeContent(
      document.getElementById(ELEMENT_IDS.output).value,
    ).root;

    const globalVars = pipe(
      Array.from,
      filter(isControlEnabled(formEl)),
      map(controlToVarEntry),
      Object.fromEntries,
    )(this.formQuery("[data-var]:not([data-scope])"));

    this.cascadeChanges(oldGlobalVars, globalVars);

    const scopeVars = pipe(
      map((scope) => [scope, this.collectScopeVars(scope)]),
      filter(([, vars]) => Object.keys(vars).length > 0),
      Object.fromEntries,
    )(SCOPES);

    this.applyScopes(scopeVars);

    const bodyClasses = pipe(
      Array.from,
      flatMap(collectActiveClasses(formEl)),
    )(this.formQuery("[data-class]"));

    const themeText = generateThemeCss(globalVars, scopeVars, bodyClasses);
    document.getElementById(ELEMENT_IDS.output).value = themeText;
  },

  cascadeColorInputs(scope, oldGlobalVars, newGlobalVars) {
    for (const input of this.formQuery(
      `input[type="color"][data-var][data-scope="${scope}"]`,
    )) {
      const oldGlobal = oldGlobalVars[input.dataset.var];
      const newGlobal = newGlobalVars[input.dataset.var];
      if (oldGlobal && newGlobal && input.value === oldGlobal) {
        input.value = newGlobal;
      }
    }
  },

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
  cascadeChanges(oldGlobalVars, newGlobalVars) {
    for (const scope of SCOPES) {
      this.cascadeColorInputs(scope, oldGlobalVars, newGlobalVars);
      this.cascadeBorderInputs(scope, oldGlobalVars, newGlobalVars);
    }
  },

  collectScopeVars(scope) {
    const docStyle = getComputedStyle(document.documentElement);

    const colorVars = pipe(
      Array.from,
      map(inputToScopedEntry(docStyle)),
      compact,
      Object.fromEntries,
    )(this.formQuery(`input[type="color"][data-var][data-scope="${scope}"]`));

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

onReady(() => ThemeEditor.init.call(ThemeEditor));
