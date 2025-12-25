import { onReady } from "./on-ready.js";
import {
  SCOPES,
  SCOPE_SELECTORS,
  parseThemeContent,
  parseBorderValue,
  generateThemeCss,
  shouldIncludeScopedVar,
} from "./theme-editor-lib.js";

let ELEMENTS = null;

// DOM selectors for applying scoped variables
const SCOPE_DOM_SELECTORS = {
  header: "header",
  nav: "nav",
  article: "article",
  form: "form",
  button: "button, .button, input[type='submit']",
};

const ThemeEditor = {
  init() {
    const form = document.getElementById("theme-editor-form");
    const output = document.getElementById("theme-output");

    // Only run on theme-editor page
    if (!form || !output) return;

    // Skip if already initialized
    if (ELEMENTS) return;

    ELEMENTS = {
      form,
      output,
      downloadBtn: document.getElementById("download-theme"),
      tabLinks: document.querySelectorAll(".tab-link"),
      tabContents: document.querySelectorAll(".tab-content"),
    };

    this.initTabNavigation();
    this.initControlsFromTheme();
    this.setupEventListeners();
  },

  formEl(id) {
    return ELEMENTS.form.querySelector(`#${id}`);
  },

  formQuery(selector) {
    return ELEMENTS.form.querySelectorAll(selector);
  },

  initTabNavigation() {
    ELEMENTS.tabLinks.forEach((tabLink) => {
      tabLink.addEventListener("click", (e) => {
        e.preventDefault();
        ELEMENTS.tabLinks.forEach((link) => link.classList.remove("active"));
        ELEMENTS.tabContents.forEach((content) =>
          content.classList.remove("active"),
        );
        tabLink.classList.add("active");
        const tabId = tabLink.dataset.tab;
        document.getElementById(`${tabId}-tab`).classList.add("active");
      });
    });
  },

  initControlsFromTheme() {
    const parsed = parseThemeContent(ELEMENTS.output.value);

    // Initialize global :root variables
    this.initGlobalControls(parsed.root);

    // Initialize scoped controls - ALWAYS init all scopes to attach event listeners
    SCOPES.forEach((scope) => {
      this.initScopedControls(scope, parsed.scopes[scope] || {});
    });

    // Apply initial scoped values to DOM for live preview
    this.applyScopedValuesToDOM(parsed.scopes);

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
        const varName = input.dataset.var;
        if (rootVars[varName]) {
          input.value = rootVars[varName];
        } else {
          input.value =
            getComputedStyle(document.documentElement)
              .getPropertyValue(varName)
              .trim() || "#000000";
        }
        input.addEventListener("input", () => this.updateThemeFromControls());
      },
    );

    // Initialize text controls
    this.formQuery('input[type="text"][data-var]:not([data-scope])').forEach(
      (input) => {
        if (input.id.includes("border")) return; // Skip border hidden inputs
        const varName = input.dataset.var;
        if (rootVars[varName]) {
          input.value = rootVars[varName];
        } else {
          input.value = getComputedStyle(document.documentElement)
            .getPropertyValue(varName)
            .trim();
        }
        input.addEventListener("input", () => this.updateThemeFromControls());
      },
    );

    // Initialize select controls
    this.formQuery("select[data-var]:not([data-scope])").forEach((input) => {
      const varName = input.dataset.var;
      if (rootVars[varName]) {
        input.value = rootVars[varName];
      } else {
        input.value = getComputedStyle(document.documentElement)
          .getPropertyValue(varName)
          .trim();
      }
      input.addEventListener("input", () => this.updateThemeFromControls());
    });

    // Initialize number controls
    this.formQuery('input[type="number"][data-var]:not([data-scope])').forEach(
      (input) => {
        const varName = input.dataset.var;
        if (rootVars[varName]) {
          input.value = parseFloat(rootVars[varName]) || 0;
        } else {
          const computed = getComputedStyle(document.documentElement)
            .getPropertyValue(varName)
            .trim();
          input.value = parseFloat(computed) || 0;
        }
        input.addEventListener("input", () => this.updateThemeFromControls());
      },
    );

    // Initialize border controls for global border
    this.initBorderControl("", rootVars["--border"]);
  },

  initScopedControls(scope, scopeVars) {
    // Initialize color controls for this scope
    this.formQuery(`input[type="color"][data-scope="${scope}"]`).forEach(
      (input) => {
        const varName = input.dataset.var;
        if (scopeVars[varName]) {
          input.value = scopeVars[varName];
        }
        // ALWAYS add event listener, even if no initial value
        input.addEventListener("input", () => this.updateThemeFromControls());
      },
    );

    // Initialize border for this scope
    this.initScopedBorderControl(scope, scopeVars["--border"]);
  },

  initBorderControl(prefix, borderValue) {
    const idPrefix = prefix ? `${prefix}-` : "";
    const widthInput = this.formEl(`${idPrefix}border-width`);
    const styleSelect = this.formEl(`${idPrefix}border-style`);
    const colorInput = this.formEl(`${idPrefix}border-color`);
    const outputInput = this.formEl(`${idPrefix}border`);

    if (!widthInput || !styleSelect || !colorInput) return;

    const parsed = parseBorderValue(borderValue);
    if (parsed) {
      widthInput.value = parsed.width;
      styleSelect.value = parsed.style;
      if (parsed.color.startsWith("#")) colorInput.value = parsed.color;
    } else {
      // Get from computed style
      const computed = getComputedStyle(document.documentElement)
        .getPropertyValue("--border")
        .trim();
      const computedParsed = parseBorderValue(computed);
      if (computedParsed) {
        widthInput.value = computedParsed.width;
        styleSelect.value = computedParsed.style;
        if (computedParsed.color.startsWith("#"))
          colorInput.value = computedParsed.color;
      }
    }

    if (outputInput) {
      outputInput.value = `${widthInput.value}px ${styleSelect.value} ${colorInput.value}`;
    }

    const updateBorder = () => {
      const borderVal = `${widthInput.value}px ${styleSelect.value} ${colorInput.value}`;
      if (outputInput) outputInput.value = borderVal;
      document.documentElement.style.setProperty("--border", borderVal);
      this.updateThemeFromControls();
    };

    widthInput.addEventListener("input", updateBorder);
    styleSelect.addEventListener("change", updateBorder);
    colorInput.addEventListener("input", updateBorder);
  },

  initScopedBorderControl(scope, borderValue) {
    const widthInput = this.formEl(`${scope}-border-width`);
    const styleSelect = this.formEl(`${scope}-border-style`);
    const colorInput = this.formEl(`${scope}-border-color`);
    const outputInput = this.formEl(`${scope}-border`);

    if (!widthInput || !styleSelect || !colorInput) return;

    const parsed = parseBorderValue(borderValue);
    if (parsed) {
      widthInput.value = parsed.width;
      styleSelect.value = parsed.style;
      if (parsed.color.startsWith("#")) colorInput.value = parsed.color;
    }

    if (outputInput) {
      outputInput.value = `${widthInput.value}px ${styleSelect.value} ${colorInput.value}`;
    }

    const updateBorder = () => {
      const borderVal = `${widthInput.value}px ${styleSelect.value} ${colorInput.value}`;
      if (outputInput) outputInput.value = borderVal;
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
        let isEnabled = rootVars[`--${id}`] !== undefined;

        // Check for select-class options
        this.formEl(`${id}[data-class]`)
          ?.querySelectorAll("option")
          .forEach((opt) => {
            if (opt.value !== "" && document.body.classList.contains(opt.value))
              isEnabled = true;
          });

        checkbox.checked = isEnabled;
        targetIds.forEach((tid) => this.toggleCheckbox(tid, isEnabled));

        checkbox.addEventListener("change", () => {
          targetIds.forEach((tid) =>
            this.toggleCheckbox(tid, checkbox.checked),
          );
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
    ELEMENTS.downloadBtn.addEventListener("click", () => this.downloadTheme());
    ELEMENTS.output.addEventListener("input", () => {
      this.initControlsFromTheme();
    });
  },

  /**
   * Apply scoped CSS variables to DOM elements for live preview
   */
  applyScopedValuesToDOM(scopeVars) {
    SCOPES.forEach((scope) => {
      const selector = SCOPE_DOM_SELECTORS[scope];
      const elements = document.querySelectorAll(selector);
      const vars = scopeVars[scope] || {};

      elements.forEach((el) => {
        // Clear previous scoped values
        ["--color-bg", "--color-text", "--color-link", "--color-link-hover", "--border"].forEach(
          (varName) => {
            el.style.removeProperty(varName);
          },
        );

        // Apply new scoped values
        Object.entries(vars).forEach(([varName, value]) => {
          el.style.setProperty(varName, value);
        });
      });
    });
  },

  updateThemeFromControls() {
    // Collect global :root variables
    const globalVars = {};
    Array.from(this.formQuery("[data-var]:not([data-scope])"))
      .filter((input) => {
        const checkbox = this.formEl(input.id + "-enabled");
        return !checkbox || checkbox.checked;
      })
      .forEach((el) => {
        const value = el.id === "border-radius" ? `${el.value}px` : el.value;
        const varName = `--${el.id}`;
        document.documentElement.style.setProperty(varName, value);
        globalVars[varName] = value;
      });

    // Collect scoped variables
    const scopeVars = {};
    SCOPES.forEach((scope) => {
      const vars = this.collectScopeVars(scope);
      if (Object.keys(vars).length > 0) {
        scopeVars[scope] = vars;
      }
    });

    // Apply scoped variables to DOM for live preview
    this.applyScopedValuesToDOM(scopeVars);

    // Handle body classes
    const bodyClasses = [];
    this.formQuery("[data-class]").forEach((el) => {
      const checkbox = this.formEl(el.id + "-enabled");
      const enabled = !checkbox || checkbox.checked;
      const values = Array.from(el.querySelectorAll("option"))
        .map((o) => o.value)
        .filter((v) => v !== "");
      values.forEach((value) => {
        const isActive = value === el.value && enabled;
        document.body.classList.toggle(value, isActive);
        if (isActive) bodyClasses.push(value);
      });
    });

    // Generate CSS
    const themeText = generateThemeCss(globalVars, scopeVars, bodyClasses);
    ELEMENTS.output.value = themeText;
  },

  collectScopeVars(scope) {
    const vars = {};
    const docStyle = getComputedStyle(document.documentElement);

    // Color inputs for this scope - compare against global value for same var
    this.formQuery(`input[type="color"][data-scope="${scope}"]`).forEach(
      (input) => {
        const varName = input.dataset.var;
        const value = input.value;
        // Get the global value for this same variable
        const globalValue = docStyle.getPropertyValue(varName).trim();
        // Include if different from global (even if it's #000000 = black)
        if (shouldIncludeScopedVar(value, globalValue)) {
          vars[varName] = value;
        }
      },
    );

    // Border for this scope - include if different from global border
    const borderOutput = this.formEl(`${scope}-border`);
    if (borderOutput && borderOutput.value) {
      const globalBorder = docStyle.getPropertyValue("--border").trim();
      if (shouldIncludeScopedVar(borderOutput.value, globalBorder)) {
        vars["--border"] = borderOutput.value;
      }
    }

    return vars;
  },

  downloadTheme() {
    const content = ELEMENTS.output.value;
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
