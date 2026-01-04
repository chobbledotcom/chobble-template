import { onReady } from "#assets/on-ready.js";
import {
  generateThemeCss,
  parseBorderValue,
  parseThemeContent,
  SCOPES,
  shouldIncludeScopedVar,
} from "#assets/theme-editor-lib.js";

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

  formEl(id) {
    return document.querySelector(`#${ELEMENT_IDS.form} #${id}`);
  },

  formQuery(selector) {
    return document.querySelectorAll(`#${ELEMENT_IDS.form} ${selector}`);
  },

  initTabNavigation() {
    document.querySelectorAll(".tab-link").forEach((tabLink) => {
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
    });
  },

  initControlsFromTheme() {
    const parsed = parseThemeContent(
      document.getElementById(ELEMENT_IDS.output).value,
    );

    // Initialize global :root variables
    this.initGlobalControls(parsed.root);

    // Initialize scoped controls - ALWAYS init all scopes to attach event listeners
    SCOPES.forEach((scope) => {
      this.initScopedControls(scope, parsed.scopes[scope] || {});
    });

    // Apply initial scoped values to DOM for live preview
    this.applyScopes(parsed.scopes);

    // Initialize body classes
    if (parsed.bodyClasses.length > 0) {
      parsed.bodyClasses.forEach((cssClass) => {
        document.body.classList.add(cssClass);
      });
    }

    // Initialize select-class controls
    this.initSelectClassControls();

    // Set up checkbox controls for global variables
    this.initCheckboxControls(parsed.root);
  },

  initGlobalControls(rootVars) {
    // Apply variables to document and initialize controls
    Object.entries(rootVars).forEach(([varName, value]) => {
      document.documentElement.style.setProperty(varName, value);
    });

    // Initialize color controls
    this.formQuery('input[type="color"][data-var]:not([data-scope])').forEach(
      (input) => {
        input.value = this.getControlValue(input.dataset.var, rootVars, {
          fallback: "#000000",
        });
        input.addEventListener("input", () => this.updateThemeFromControls());
      },
    );

    // Initialize text controls
    this.formQuery('input[type="text"][data-var]:not([data-scope])').forEach(
      (input) => {
        if (input.id.includes("border")) return; // Skip border hidden inputs
        input.value = this.getControlValue(input.dataset.var, rootVars);
        input.addEventListener("input", () => this.updateThemeFromControls());
      },
    );

    // Initialize select controls
    this.formQuery("select[data-var]:not([data-scope])").forEach((input) => {
      input.value = this.getControlValue(input.dataset.var, rootVars);
      input.addEventListener("input", () => this.updateThemeFromControls());
    });

    // Initialize number controls
    this.formQuery('input[type="number"][data-var]:not([data-scope])').forEach(
      (input) => {
        input.value = this.getControlValue(input.dataset.var, rootVars, {
          type: "number",
        });
        input.addEventListener("input", () => this.updateThemeFromControls());
      },
    );

    // Initialize border controls for global border
    this.initBorderControl("", rootVars["--border"]);
  },

  initScopedControls(scope, scopeVars) {
    const docStyle = getComputedStyle(document.documentElement);

    // Initialize color controls for this scope
    // IMPORTANT: Must initialize to global values, not browser default #000000
    // Otherwise unchanged inputs pollute output (see test: browser-default-black-should-not-pollute-output)
    // Require [data-var] to exclude border-color inputs (which don't represent CSS vars)
    this.formQuery(
      `input[type="color"][data-var][data-scope="${scope}"]`,
    ).forEach((input) => {
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
    });

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

    const widthInput = this.formEl(`${idPrefix}border-width`);
    const styleSelect = this.formEl(`${idPrefix}border-style`);
    const colorInput = this.formEl(`${idPrefix}border-color`);
    const outputInput = this.formEl(`${idPrefix}border`);

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
    this.formQuery("select[data-class]").forEach((input) => {
      input.querySelectorAll("option").forEach((o) => {
        if (document.body.classList.contains(o.value)) input.value = o.value;
      });
      input.addEventListener("input", () => this.updateThemeFromControls());
    });
  },

  initCheckboxControls(rootVars) {
    document
      .querySelectorAll('input[type="checkbox"][data-target]')
      .forEach((checkbox) => {
        const targetIds = checkbox.dataset.target.split(",");
        const id = checkbox.id.replace(/-enabled$/, "");
        const hasRootVar = rootVars[`--${id}`] !== undefined;
        const hasActiveClass = Array.from(
          this.formEl(`${id}[data-class]`)?.querySelectorAll("option") || [],
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
      });
  },

  toggleCheckbox(id, checked) {
    const target = this.formEl(id);
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
    SCOPES.forEach((scope) => {
      const selector = SCOPE_DOM_SELECTORS[scope];
      const elements = document.querySelectorAll(selector);
      const vars = scopeVars[scope] || {};

      elements.forEach((el) => {
        // Clear previous scoped values
        [
          "--color-bg",
          "--color-text",
          "--color-link",
          "--color-link-hover",
          "--border",
        ].forEach((varName) => {
          el.style.removeProperty(varName);
        });

        // Apply new scoped values
        Object.entries(vars).forEach(([varName, value]) => {
          el.style.setProperty(varName, value);
        });
      });
    });
  },

  updateThemeFromControls() {
    // Read previous global values from textarea for cascade comparison
    const oldGlobalVars = parseThemeContent(
      document.getElementById(ELEMENT_IDS.output).value,
    ).root;

    // Collect global :root variables
    const globalVars = Object.fromEntries(
      Array.from(this.formQuery("[data-var]:not([data-scope])"))
        .filter((input) => {
          const checkbox = this.formEl(`${input.id}-enabled`);
          return !checkbox || checkbox.checked;
        })
        .map((el) => {
          const value = el.id === "border-radius" ? `${el.value}px` : el.value;
          const varName = `--${el.id}`;
          document.documentElement.style.setProperty(varName, value);
          return [varName, value];
        }),
    );

    // Cascade global changes to scoped inputs that were "following" the old global value
    // This prevents unchanged scoped inputs from appearing as overrides when global changes
    this.cascadeGlobalChangesToScopes(oldGlobalVars, globalVars);

    // Collect scoped variables
    const scopeVars = Object.fromEntries(
      SCOPES.map((scope) => [scope, this.collectScopeVars(scope)]).filter(
        ([, vars]) => Object.keys(vars).length > 0,
      ),
    );

    // Apply scoped variables to DOM for live preview
    this.applyScopes(scopeVars);

    // Handle body classes - toggle DOM classes and collect active ones
    const bodyClasses = Array.from(this.formQuery("[data-class]")).flatMap(
      (el) => {
        const checkbox = this.formEl(`${el.id}-enabled`);
        const enabled = !checkbox || checkbox.checked;
        return Array.from(el.querySelectorAll("option"))
          .map((o) => o.value)
          .filter((v) => v !== "")
          .map((value) => {
            const isActive = value === el.value && enabled;
            document.body.classList.toggle(value, isActive);
            return isActive ? value : null;
          })
          .filter((v) => v !== null);
      },
    );

    // Generate CSS and write to textarea
    const themeText = generateThemeCss(globalVars, scopeVars, bodyClasses);
    document.getElementById(ELEMENT_IDS.output).value = themeText;
  },

  /**
   * Cascade global value changes to scoped inputs that were "following" the old global value.
   * This prevents unchanged scoped inputs from appearing as overrides when global changes.
   */
  cascadeGlobalChangesToScopes(oldGlobalVars, newGlobalVars) {
    SCOPES.forEach((scope) => {
      // Color inputs
      this.formQuery(
        `input[type="color"][data-var][data-scope="${scope}"]`,
      ).forEach((input) => {
        const varName = input.dataset.var;
        const oldGlobal = oldGlobalVars[varName];
        const newGlobal = newGlobalVars[varName];

        // If this scoped input was showing the old global value, update it to the new global
        if (oldGlobal && newGlobal && input.value === oldGlobal) {
          input.value = newGlobal;
        }
      });

      // Border inputs
      const borderOutput = this.formEl(`${scope}-border`);
      if (borderOutput) {
        const oldGlobalBorder = oldGlobalVars["--border"];
        const newGlobalBorder = newGlobalVars["--border"];
        if (
          oldGlobalBorder &&
          newGlobalBorder &&
          borderOutput.value === oldGlobalBorder
        ) {
          // Update border component inputs too
          const widthInput = this.formEl(`${scope}-border-width`);
          const styleSelect = this.formEl(`${scope}-border-style`);
          const colorInput = this.formEl(`${scope}-border-color`);
          const parsed = parseBorderValue(newGlobalBorder);
          this.applyBorderToInputs(parsed, widthInput, styleSelect, colorInput);
          borderOutput.value = newGlobalBorder;
        }
      }
    });
  },

  collectScopeVars(scope) {
    const docStyle = getComputedStyle(document.documentElement);

    // Color inputs for this scope - compare against global value for same var
    // Require [data-var] to exclude border-color inputs (which don't represent CSS vars)
    const colorVars = Object.fromEntries(
      Array.from(
        this.formQuery(`input[type="color"][data-var][data-scope="${scope}"]`),
      )
        .map((input) => {
          const varName = input.dataset.var;
          const value = input.value;
          const globalValue = docStyle.getPropertyValue(varName).trim();
          return shouldIncludeScopedVar(value, globalValue)
            ? [varName, value]
            : null;
        })
        .filter((entry) => entry !== null),
    );

    // Border for this scope - include if different from global border
    const borderOutput = this.formEl(`${scope}-border`);
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
