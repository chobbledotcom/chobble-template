import { onReady } from "./on-ready.js";

let ELEMENTS = null;

// Scopes that support local CSS variable overrides
const SCOPES = ["header", "nav", "article", "form", "button"];

// The button selector needs special handling for CSS output
const SCOPE_SELECTORS = {
  header: "header",
  nav: "nav",
  article: "article",
  form: "form",
  button: 'button,\n.button,\ninput[type="submit"]',
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
    const parsed = this.parseThemeContent();

    // Initialize global :root variables
    this.initGlobalControls(parsed.root);

    // Initialize scoped controls
    SCOPES.forEach((scope) => {
      if (parsed.scopes[scope]) {
        this.initScopedControls(scope, parsed.scopes[scope]);
      }
    });

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

  parseThemeContent() {
    const themeContent = ELEMENTS.output.value;
    const result = {
      root: {},
      scopes: {},
      bodyClasses: [],
    };

    // Parse :root block
    const rootMatch = themeContent.match(/:root\s*\{([^}]*)\}/s);
    if (rootMatch) {
      result.root = this.parseCssBlock(rootMatch[1]);
    }

    // Parse scoped blocks (header, nav, article, form, button)
    SCOPES.forEach((scope) => {
      // Handle button which might be multi-line selector
      let pattern;
      if (scope === "button") {
        pattern = /button\s*,[\s\S]*?input\[type="submit"\]\s*\{([^}]*)\}/;
      } else {
        pattern = new RegExp(`${scope}\\s*\\{([^}]*)\\}`, "s");
      }
      const match = themeContent.match(pattern);
      if (match) {
        result.scopes[scope] = this.parseCssBlock(match[1]);
      }
    });

    // Parse body_classes comment
    const classesMatch = themeContent.match(/\/\* body_classes: (.+) \*\//);
    if (classesMatch) {
      result.bodyClasses = classesMatch[1].split(",").map((s) => s.trim());
    }

    return result;
  },

  parseCssBlock(cssText) {
    const vars = {};
    cssText.split(";").forEach((line) => {
      const match = line.match(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*(.+?)\s*$/);
      if (match) {
        vars[match[1]] = match[2];
      }
    });
    return vars;
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
          input.value = getComputedStyle(document.documentElement)
            .getPropertyValue(varName)
            .trim();
        }
        input.addEventListener("input", () => this.updateThemeFromControls());
      },
    );

    // Initialize text controls
    this.formQuery('input[type="text"][data-var]:not([data-scope])')
      .forEach((input) => {
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
      });

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
        input.addEventListener("input", () => this.updateThemeFromControls());
      },
    );

    // Initialize border for this scope
    if (scopeVars["--border"]) {
      this.initScopedBorderControl(scope, scopeVars["--border"]);
    } else {
      // Just add event listeners
      this.initScopedBorderControl(scope, null);
    }
  },

  initBorderControl(prefix, borderValue) {
    const idPrefix = prefix ? `${prefix}-` : "";
    const widthInput = this.formEl(`${idPrefix}border-width`);
    const styleSelect = this.formEl(`${idPrefix}border-style`);
    const colorInput = this.formEl(`${idPrefix}border-color`);
    const outputInput = this.formEl(`${idPrefix}border`);

    if (!widthInput || !styleSelect || !colorInput) return;

    if (borderValue) {
      const borderParts = borderValue.match(/(\d+)px\s+(\w+)\s+(.+)/);
      if (borderParts && borderParts.length === 4) {
        widthInput.value = parseInt(borderParts[1], 10);
        styleSelect.value = borderParts[2];
        if (borderParts[3].startsWith("#")) colorInput.value = borderParts[3];
      }
    } else {
      // Get from computed style
      const computed = getComputedStyle(document.documentElement)
        .getPropertyValue("--border")
        .trim();
      const borderParts = computed.match(/(\d+)px\s+(\w+)\s+(.+)/);
      if (borderParts && borderParts.length === 4) {
        widthInput.value = parseInt(borderParts[1], 10);
        styleSelect.value = borderParts[2];
        if (borderParts[3].startsWith("#")) colorInput.value = borderParts[3];
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

    if (borderValue) {
      const borderParts = borderValue.match(/(\d+)px\s+(\w+)\s+(.+)/);
      if (borderParts && borderParts.length === 4) {
        widthInput.value = parseInt(borderParts[1], 10);
        styleSelect.value = borderParts[2];
        if (borderParts[3].startsWith("#")) colorInput.value = borderParts[3];
      }
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

  updateThemeFromControls() {
    let themeText = ":root {\n";

    // Collect global :root variables
    Array.from(this.formQuery("[data-var]:not([data-scope])"))
      .filter((input) => {
        const checkbox = this.formEl(input.id + "-enabled");
        return !checkbox || checkbox.checked;
      })
      .forEach((el) => {
        const value = el.id === "border-radius" ? `${el.value}px` : el.value;
        document.documentElement.style.setProperty(`--${el.id}`, value);
        themeText += `  --${el.id}: ${value};\n`;
      });

    themeText += "}\n";

    // Generate scoped blocks
    SCOPES.forEach((scope) => {
      const scopeVars = this.collectScopeVars(scope);
      if (Object.keys(scopeVars).length > 0) {
        const selector = SCOPE_SELECTORS[scope];
        themeText += `\n${selector} {\n`;
        Object.entries(scopeVars).forEach(([varName, value]) => {
          themeText += `  ${varName}: ${value};\n`;
        });
        themeText += "}\n";
      }
    });

    // Handle body classes
    const bodyClasses = [];
    this.formQuery("[data-class]").forEach((el) => {
      const checkbox = this.formEl(el.id + "-enabled");
      const enabled = !checkbox || checkbox.checked;
      const values = Array.from(el.querySelectorAll("option"))
        .map((o) => o.value)
        .filter((v) => v !== "");
      values.forEach((value) => {
        const isActive = value === el.value;
        document.body.classList.toggle(value, isActive);
        if (isActive) bodyClasses.push(value);
      });
    });

    if (bodyClasses.length > 0) {
      themeText += `\n/* body_classes: ${bodyClasses.join(", ")} */`;
    }

    ELEMENTS.output.value = themeText;
  },

  collectScopeVars(scope) {
    const vars = {};
    const defaultBg = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-bg")
      .trim();

    // Color inputs for this scope
    this.formQuery(`input[type="color"][data-scope="${scope}"]`).forEach(
      (input) => {
        const varName = input.dataset.var;
        const value = input.value;
        // Only include if different from the default (non-black/non-white colors indicate intentional override)
        if (value && value !== "#000000" && value !== defaultBg) {
          vars[varName] = value;
        }
      },
    );

    // Border for this scope
    const borderOutput = this.formEl(`${scope}-border`);
    if (borderOutput && borderOutput.value) {
      const globalBorder = getComputedStyle(document.documentElement)
        .getPropertyValue("--border")
        .trim();
      // Only include if different from global
      if (borderOutput.value !== globalBorder) {
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
