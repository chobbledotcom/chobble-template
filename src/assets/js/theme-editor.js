(function () {
  const ThemeEditor = {
    componentTypes: ["default", "header", "nav", "main", "form"],

    elements: {
      form: document.getElementById("theme-editor-form"),
      output: document.getElementById("theme-output"),
      downloadBtn: document.getElementById("download-theme"),
      bunnyFontsInput: document.getElementById("bunny-fonts"),
      tabLinks: document.querySelectorAll(".tab-link"),
      tabContents: document.querySelectorAll(".tab-content"),
    },

    init() {
      this.initTabNavigation();
      this.loadThemeScss();
      this.setupEventListeners();
    },

    initTabNavigation() {
      this.elements.tabLinks.forEach((tabLink) => {
        tabLink.addEventListener("click", (e) => {
          e.preventDefault();
          this.elements.tabLinks.forEach((link) =>
            link.classList.remove("active"),
          );
          this.elements.tabContents.forEach((content) =>
            content.classList.remove("active"),
          );
          tabLink.classList.add("active");
          const tabId = tabLink.dataset.tab;
          document.getElementById(`${tabId}-tab`).classList.add("active");
        });
      });
    },

    loadThemeScss() {
      fetch("/css/theme.css")
        .then((response) => response.text())
        .then((content) => {
          this.elements.output.value = content;
          this.initControlsFromTheme(content);
        })
        .catch((error) => {
          console.error("Error loading theme.scss:", error);
          this.elements.output.value = ":root {\n}\n";
          this.initControlsFromTheme(":root {\n}\n");
        });
    },

    initControlsFromTheme(themeContent) {
      const cssVars = this.extractCssVarsFromTheme(themeContent);

      const fontImportMatch = themeContent.match(
        /@import url\("https:\/\/fonts\.bunny\.net\/css\?family=([^&"]+)/,
      );
      if (fontImportMatch && fontImportMatch[1]) {
        this.elements.bunnyFontsInput.value = fontImportMatch[1];
        this.updateLiveFont(fontImportMatch[1]);
      }

      this.initControlValues();
      this.initCheckboxControls(cssVars);

      this.elements.output.addEventListener("input", () => {
        this.updateControlsFromTextarea();
      });
    },

    extractCssVarsFromTheme(themeContent) {
      const cssVars = new Set();
      const rootBlock = themeContent.match(/:root\s*{([^}]*)}/s);

      if (rootBlock && rootBlock[1]) {
        const declarations = rootBlock[1].split(";");
        declarations.forEach((declaration) => {
          const match = declaration.match(/\s*(--[a-zA-Z0-9-]+)\s*:/);
          if (match && match[1]) {
            cssVars.add(match[1]);
          }
        });
      }

      return cssVars;
    },

    initControlValues() {
      this.initColorControls();
      this.initTextControls();
      this.initNumberControls();
      this.initBorderControls();
    },

    initCheckboxControls(cssVars) {
      document
        .querySelectorAll('input[type="checkbox"][data-target]')
        .forEach((checkbox) => {
          const targetIds = checkbox.dataset.target.split(",");
          const varName = `--${checkbox.id}`;
          const isEnabled = cssVars.has(varName);

          checkbox.checked = isEnabled;
          targetIds.forEach((id) => toggleCheckbox(id, isEnabled));

          checkbox.addEventListener("change", () => {
            targetIds.forEach((id) => toggleCheckbox(id, checkbox.checked));
            this.updateThemeFromControls();
          });
        });

      function toggleCheckbox(id, checked) {
        const target = document.getElementById(id);
        if (checked) {
          target.disabled = false;
          target.style.removeProperty("display");
        } else {
          target.disabled = true;
          target.style.display = "none";
          document.documentElement.style.removeProperty(`--${id}`);
        }
      }
    },

    updateControlsFromTextarea() {
      const themeContent = this.elements.output.value;
      const cssVars = this.extractCssVarsFromTheme(themeContent);

      const checkboxes = document.querySelectorAll('input[type="checkbox"]');

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
              .forEach((id) => toggleCheckbox(id, isEnabled));
          }
        }
      });

      const fontImportMatch = themeContent.match(
        /@import url\("https:\/\/fonts\.bunny\.net\/css\?family=([^&"]+)/,
      );
      if (fontImportMatch && fontImportMatch[1]) {
        this.elements.bunnyFontsInput.value = fontImportMatch[1];
        this.updateLiveFont(fontImportMatch[1]);
      } else {
        this.elements.bunnyFontsInput.value = "";
      }
    },

    initColorControls() {
      document
        .querySelectorAll('input[type="color"][data-var]')
        .forEach((input) => {
          input.value = getComputedStyle(document.documentElement)
            .getPropertyValue(input.dataset.var)
            .trim();
          input.addEventListener("input", () => this.updateThemeFromControls());
        });
    },

    initTextControls() {
      Array.from(document.querySelectorAll('input[type="text"][data-var]'))
        .filter((input) => !input.id.includes("border"))
        .forEach((input) => {
          input.value = getComputedStyle(document.documentElement)
            .getPropertyValue(input.dataset.var)
            .trim();
          input.addEventListener("input", () => this.updateThemeFromControls());
        });
    },

    initNumberControls() {
      document
        .querySelectorAll('input[type="number"][data-var]')
        .forEach((input) => {
          input.value = parseFloat(
            getComputedStyle(document.documentElement)
              .getPropertyValue(input.dataset.var)
              .trim(),
          );
          input.addEventListener("input", () => this.updateThemeFromControls());
        });
    },

    initBorderControls() {
      this.componentTypes.forEach((type) => {
        const prefix = type === "default" ? "" : `${type}-`;

        const widthInput = document.getElementById(`${prefix}border-width`);
        const styleSelect = document.getElementById(`${prefix}border-style`);
        const colorInput = document.getElementById(`${prefix}border-color`);
        const outputInput = document.getElementById(`${prefix}border`);

        if (!widthInput || !styleSelect || !colorInput || !outputInput) return;

        const cssVar = outputInput.dataset.var;
        let currentBorderValue = getComputedStyle(document.documentElement)
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

        widthInput.addEventListener("input", () =>
          this.updateBorder(
            widthInput,
            styleSelect,
            colorInput,
            outputInput,
            cssVar,
          ),
        );

        styleSelect.addEventListener("change", () =>
          this.updateBorder(
            widthInput,
            styleSelect,
            colorInput,
            outputInput,
            cssVar,
          ),
        );

        colorInput.addEventListener("input", () =>
          this.updateBorder(
            widthInput,
            styleSelect,
            colorInput,
            outputInput,
            cssVar,
          ),
        );
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

        if (borderParts[3].startsWith("#")) {
          colorInput.value = borderParts[3];
        }
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
      this.elements.downloadBtn.addEventListener("click", () =>
        this.downloadTheme(),
      );

      this.elements.bunnyFontsInput.addEventListener("input", () =>
        this.updateThemeFromControls(),
      );
    },

    updateThemeFromControls() {
      const activeVars = new Set();
      const bunnyFonts = this.elements.bunnyFontsInput.value.trim();

      let themeText = "";
      if (bunnyFonts) {
        themeText += `@import url("https://fonts.bunny.net/css?family=${bunnyFonts}&display=swap");\n\n`;
        this.updateLiveFont(bunnyFonts);
      }

      themeText += ":root {\n";

      const inputs = Array.from(
        this.elements.form.querySelectorAll("[data-var]"),
      ).filter((input) => {
        const checkboxId = input.id + "-enabled";
        const checkbox = document.getElementById(checkboxId);

        if (!checkbox && input.id.includes("border")) {
          const borderCheckboxId =
            input.id
              .replace("border-width", "border")
              .replace("border-style", "border")
              .replace("border-color", "border") + "-enabled";
          const borderCheckbox = document.getElementById(borderCheckboxId);
          return !borderCheckbox || borderCheckbox.checked;
        }

        return !checkbox || checkbox.checked;
      });

      inputs.forEach((input) => {
        const varName = input.dataset.var;
        if (!varName) return;

        const value = input.value;
        document.documentElement.style.setProperty(varName, value);
        themeText += `  ${varName}: ${value};\n`;
        activeVars.add(varName);
      });

      themeText += "}\n";
      this.elements.output.value = themeText;
    },

    updateLiveFont(bunnyFonts) {
      const existingLinkEl = document.querySelector("link[data-bunny-fonts]");
      const fontUrl = `https://fonts.bunny.net/css?family=${bunnyFonts}&display=swap`;

      if (existingLinkEl) {
        existingLinkEl.href = fontUrl;
      } else {
        const linkEl = document.createElement("link");
        linkEl.rel = "stylesheet";
        linkEl.href = fontUrl;
        linkEl.setAttribute("data-bunny-fonts", "true");
        document.head.appendChild(linkEl);
      }
    },

    downloadTheme() {
      const content = this.elements.output.value;
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

  document.addEventListener("DOMContentLoaded", () =>
    ThemeEditor.init.call(ThemeEditor),
  );
})();
