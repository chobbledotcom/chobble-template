(() => {
  let ELEMENTS = null;

  const ThemeEditor = {
    init() {
      if (ELEMENTS) return;

      ELEMENTS = {
        form: document.getElementById("theme-editor-form"),
        output: document.getElementById("theme-output"),
        downloadBtn: document.getElementById("download-theme"),
        tabLinks: document.querySelectorAll(".tab-link"),
        tabContents: document.querySelectorAll(".tab-content"),
      };

      this.initTabNavigation();
      this.initControlsFromTheme();
      this.setupEventListeners();
    },

    formEl: (id) => {
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
      const cssVars = this.extractCssVarsFromTheme();

      this.initControlValues();
      this.initCheckboxControls(cssVars);
    },

    extractCssVarsFromTheme() {
      const themeContent = ELEMENTS.output.value;
      const cssVars = new Set();

      themeContent
        .match(/:root\s*{([^}]*)}/s)?.[1]
        ?.split(";")
        .map((line) => line.match(/^\s*(--[a-zA-Z0-9-]+)\s*:\s(.+)$/))
        .filter((regex) => regex)
        .forEach((regex) => {
          cssVars.add(regex[1]);
          document.documentElement.style.setProperty(regex[1], regex[2]);
        });

      themeContent
        .match(/\/\* body_classes: (.+) \*\//)?.[1]
        ?.split(",")
        ?.map((s) => s.trim())
        ?.forEach((cssClass) => cssVars.add(cssClass));

      return cssVars;
    },

    initControlValues() {
      this.initColorControls();
      this.initTextControls();
      this.initSelectControls();
      this.initSelectClassControls();
      this.initNumberControls();
      this.initBorderControls();
    },

    toggleCheckbox(id, checked) {
      const target = this.formEl(id);
      if (checked) {
        target.disabled = false;
        target.style.removeProperty("display");
      } else {
        target.disabled = true;
        target.style.display = "none";
        document.documentElement.style.removeProperty(`--${id}`);
      }
    },

    initCheckboxControls(cssVars) {
      document
        .querySelectorAll('input[type="checkbox"][data-target]')
        .forEach((checkbox) => {
          const targetIds = checkbox.dataset.target.split(",");
          const id = checkbox.id.replace(/-enabled$/, "");
          let isEnabled = cssVars.has(`--${id}`);

          this.formEl(`${id}[data-class]`)
            ?.querySelectorAll("option")
            .forEach((opt) => {
              console.log(opt.value);
              console.log(document.body.classList);
              console.log(document.body.classList.contains(opt.value));
              if (
                opt.value != "" &&
                document.body.classList.contains(opt.value)
              )
                isEnabled = true;
            });

          checkbox.checked = isEnabled;
          targetIds.forEach((id) => this.toggleCheckbox(id, isEnabled));

          checkbox.addEventListener("change", () => {
            targetIds.forEach((id) =>
              this.toggleCheckbox(id, checkbox.checked),
            );
            this.updateThemeFromControls();
          });
        });
    },

    updateControlsFromTextarea() {
      const cssVars = this.extractCssVarsFromTheme();

      const checkboxes = this.formQuery('input[type="checkbox"]');

      checkboxes.forEach((checkbox) => {
        if (!checkbox.dataset.var) return;

        const varName = checkbox.dataset.var;
        const isEnabled = cssVars.has(varName);

        if (checkbox.checked !== isEnabled) {
          checkbox.checked = isEnabled;

          if (!isEnabled && varName) {
            document.documentElement.style.removeProperty(varName);
          }

          if (checkbox.dataset.target) {
            checkbox.dataset.target
              .split(",")
              .forEach((id) => this.toggleCheckbox(id, isEnabled));
          }
        }
      });
    },

    initCssVarInput(input) {
      input.value = getComputedStyle(document.documentElement)
        .getPropertyValue(input.dataset.var)
        .trim();
      input.addEventListener("input", () => this.updateThemeFromControls());
    },

    initColorControls() {
      this.formQuery('input[type="color"][data-var]').forEach((input) =>
        this.initCssVarInput(input),
      );
    },

    initTextControls() {
      Array.from(this.formQuery('input[type="text"][data-var]'))
        .filter((input) => !input.id.includes("border"))
        .forEach((input) => this.initCssVarInput(input));
    },

    initSelectControls() {
      this.formQuery("select[data-var]").forEach((input) =>
        this.initCssVarInput(input),
      );
    },

    initSelectClassControls() {
      this.formQuery("select[data-class]").forEach((input) => {
        input.querySelectorAll("option").forEach((o) => {
          if (document.body.classList.contains(o.value)) input.value = o.value;
        });
        input.addEventListener("input", () => this.updateThemeFromControls());
      });
    },

    initNumberControls() {
      this.formQuery('input[type="number"][data-var]').forEach((input) => {
        this.initCssVarInput(input);
        input.value = parseFloat(input.value) || 0;
      });
    },

    initBorderControls() {
      [
        "default",
        "header",
        "nav",
        "main",
        "form",
        "form-button",
        "form-button-hover",
      ].forEach((type) => {
        const prefix = type === "default" ? "" : `${type}-`;
        const widthInput = this.formEl(`${prefix}border-width`);
        const styleSelect = this.formEl(`${prefix}border-style`);
        const colorInput = this.formEl(`${prefix}border-color`);
        const outputInput = this.formEl(`${prefix}border`);
        const cssVar = outputInput.dataset.var;

        const currentBorderValue = getComputedStyle(document.documentElement)
          .getPropertyValue(cssVar)
          .trim();

        this.setupBorderControl(
          currentBorderValue,
          widthInput,
          styleSelect,
          colorInput,
          outputInput,
          cssVar,
        );

        const updateBorder = () => {
          this.updateBorder(
            widthInput,
            styleSelect,
            colorInput,
            outputInput,
            cssVar,
          );
        };

        widthInput.addEventListener("input", updateBorder);
        styleSelect.addEventListener("change", updateBorder);
        colorInput.addEventListener("input", updateBorder);
      });
    },

    setupBorderControl(
      borderValue,
      widthInput,
      styleSelect,
      colorInput,
      outputInput,
      cssVar,
    ) {
      const borderParts = borderValue.match(/(\d+)px\s+(\w+)\s+(.+)/);

      if (borderParts && borderParts.length === 4) {
        widthInput.value = parseInt(borderParts[1], 10);
        styleSelect.value = borderParts[2];
        if (borderParts[3].startsWith("#")) colorInput.value = borderParts[3];
      }

      outputInput.value = `${widthInput.value}px ${styleSelect.value} ${colorInput.value}`;
    },

    updateBorder(widthInput, styleSelect, colorInput, outputInput, cssVar) {
      const borderValue = `${widthInput.value}px ${styleSelect.value} ${colorInput.value}`;
      outputInput.value = borderValue;
      document.documentElement.style.setProperty(cssVar, borderValue);
      this.updateThemeFromControls();
    },

    setupEventListeners() {
      ELEMENTS.downloadBtn.addEventListener("click", () =>
        this.downloadTheme(),
      );
      ELEMENTS.output.addEventListener("input", () => {
        this.updateControlsFromTextarea();
      });
    },

    updateThemeFromControls() {
      let themeText = ":root {\n";
      Array.from(this.formQuery("[data-var]"))
        .filter((input) => {
          const checkbox = this.formEl(input.id + "-enabled");
          return !checkbox || checkbox.checked;
        })
        .forEach((el) => {
          const value = el.id == "border-radius" ? `${el.value}px` : el.value;
          document.documentElement.style.setProperty(`--${el.id}`, value);
          themeText += `  --${el.id}: ${value};\n`;
        });

      themeText += "}\n";

      const bodyClasses = [];
      this.formQuery("[data-class]").forEach((el) => {
        const checkbox = this.formEl(el.id + "-enabled");
        const enabled = !checkbox || checkbox.checked;
        const values = Array.from(el.querySelectorAll("option"))
          .map((o) => o.value)
          .filter((v) => v != "");
        const value = el.value;
        values.forEach((value) => {
          const enabled = value == el.value;
          document.body.classList.toggle(value, enabled);
          if (enabled) bodyClasses.push(value);
        });
      });

      if (bodyClasses.length > 0) {
        themeText += `\n\n/* body_classes: ${bodyClasses.join(", ")} */`;
      }

      ELEMENTS.output.value = themeText;
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  document.addEventListener("turbo:load", init);
})();
