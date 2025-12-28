import { JSDOM } from "jsdom";
import {
  GLOBAL_INPUTS,
  getScopes,
  SCOPED_INPUTS,
} from "../src/assets/js/theme-editor-config.js";
import {
  collectScopeVarsFromFormData,
  generateThemeCss,
  parseBorderValue,
  parseCssBlock,
  parseThemeContent,
  SCOPE_SELECTORS,
  SCOPES,
  shouldIncludeScopedVar,
} from "../src/assets/js/theme-editor-lib.js";
import {
  createTestRunner,
  expectDeepEqual,
  expectFalse,
  expectStrictEqual,
  expectTrue,
} from "./test-utils.js";

// ============================================
// Unit Tests - Core parsing functions
// ============================================

const parsingTests = [
  {
    name: "parseCssBlock-parses-variables",
    description: "Parses CSS variables from block content",
    test: () => {
      const css = `
        --color-bg: #ffffff;
        --color-text: #000000;
        --border: 2px solid #333;
      `;
      const result = parseCssBlock(css);
      expectDeepEqual(result, {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
        "--border": "2px solid #333",
      });
    },
  },
  {
    name: "parseCssBlock-ignores-non-variables",
    description: "Ignores regular CSS properties",
    test: () => {
      const css = `
        --color-bg: #fff;
        background: red;
        --color-text: #000;
      `;
      const result = parseCssBlock(css);
      expectDeepEqual(result, {
        "--color-bg": "#fff",
        "--color-text": "#000",
      });
    },
  },
  {
    name: "parseThemeContent-full-theme",
    description: "Parses complete theme with all sections",
    test: () => {
      const theme = `
:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
  --color-link: #f6f5f4;
}

header {
  --color-text: #ffffff;
}

nav {
  --color-bg: #333;
}

article {
  --color-bg: #f0f0f0;
}

form {
  --border: 1px solid #ccc;
}

button,
.button,
input[type="submit"] {
  --color-bg: #007bff;
}

/* body_classes: header-centered-dark */
      `;
      const result = parseThemeContent(theme);

      expectDeepEqual(result.root, {
        "--color-bg": "#241f31",
        "--color-text": "#9a9996",
        "--color-link": "#f6f5f4",
      });
      expectDeepEqual(result.scopes.header, { "--color-text": "#ffffff" });
      expectDeepEqual(result.scopes.nav, { "--color-bg": "#333" });
      expectDeepEqual(result.scopes.article, { "--color-bg": "#f0f0f0" });
      expectDeepEqual(result.scopes.form, { "--border": "1px solid #ccc" });
      expectDeepEqual(result.scopes.button, { "--color-bg": "#007bff" });
      expectDeepEqual(result.bodyClasses, ["header-centered-dark"]);
    },
  },
  {
    name: "parseBorderValue-parses-border",
    description: "Parses border value into components",
    test: () => {
      expectDeepEqual(parseBorderValue("2px solid #000000"), {
        width: 2,
        style: "solid",
        color: "#000000",
      });
      expectDeepEqual(parseBorderValue("3px dashed #ff0000"), {
        width: 3,
        style: "dashed",
        color: "#ff0000",
      });
    },
  },
];

// ============================================
// Unit Tests - CSS Generation
// ============================================

const generationTests = [
  {
    name: "generateThemeCss-complete",
    description: "Generates complete CSS with all sections",
    test: () => {
      const globalVars = {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
      };
      const scopeVars = {
        header: { "--color-text": "#ffffff" },
        nav: { "--color-link": "#00ff00" },
        button: { "--color-bg": "#007bff" },
      };
      const bodyClasses = ["header-centered-dark"];

      const result = generateThemeCss(globalVars, scopeVars, bodyClasses);

      expectTrue(result.includes(":root {"));
      expectTrue(result.includes("--color-bg: #ffffff;"));
      expectTrue(result.includes("--color-text: #000000;"));
      expectTrue(result.includes("header {"));
      expectTrue(result.includes("nav {"));
      expectTrue(result.includes("button,"));
      expectTrue(result.includes(".button,"));
      expectTrue(result.includes('input[type="submit"]'));
      expectTrue(result.includes("/* body_classes: header-centered-dark */"));
    },
  },
  {
    name: "generateThemeCss-omits-empty-scopes",
    description: "Does not include empty scope blocks",
    test: () => {
      const scopeVars = {
        header: { "--color-text": "#fff" },
        nav: {},
        article: {},
      };
      const result = generateThemeCss({}, scopeVars, []);

      expectTrue(result.includes("header {"));
      expectFalse(result.includes("nav {"));
      expectFalse(result.includes("article {"));
    },
  },
];

// ============================================
// Unit Tests - Scope variable filtering
// ============================================

const scopeFilterTests = [
  {
    name: "shouldIncludeScopedVar-includes-different",
    description: "Includes value when different from global",
    test: () => {
      expectTrue(shouldIncludeScopedVar("#ff0000", "#ffffff"));
      expectTrue(shouldIncludeScopedVar("#000000", "#ffffff"));
    },
  },
  {
    name: "shouldIncludeScopedVar-excludes-same",
    description: "Excludes value when same as global",
    test: () => {
      expectFalse(shouldIncludeScopedVar("#ffffff", "#ffffff"));
      expectFalse(shouldIncludeScopedVar("2px solid #333", "2px solid #333"));
    },
  },
  {
    name: "collectScopeVarsFromFormData-filters-correctly",
    description: "Only includes values that differ from global",
    test: () => {
      const formData = {
        "--color-bg": "#ff0000",
        "--color-text": "#ffffff",
        "--color-link": "#0000ff",
      };
      const globals = {
        "--color-bg": "#ffffff",
        "--color-text": "#ffffff",
        "--color-link": "#000000",
      };
      const result = collectScopeVarsFromFormData(formData, globals);

      expectDeepEqual(result, {
        "--color-bg": "#ff0000",
        "--color-link": "#0000ff",
      });
    },
  },
];

// ============================================
// Unit Tests - Config validation
// ============================================

const configTests = [
  {
    name: "scopes-match-between-lib-and-config",
    description: "SCOPES constant matches config",
    test: () => {
      expectDeepEqual(SCOPES, ["header", "nav", "article", "form", "button"]);
      expectDeepEqual(getScopes(), SCOPES);
    },
  },
  {
    name: "scope-selectors-defined-correctly",
    description: "All scope selectors are correctly defined",
    test: () => {
      expectStrictEqual(SCOPE_SELECTORS.header, "header");
      expectStrictEqual(SCOPE_SELECTORS.nav, "nav");
      expectStrictEqual(SCOPE_SELECTORS.article, "article");
      expectStrictEqual(SCOPE_SELECTORS.form, "form");
      expectTrue(SCOPE_SELECTORS.button.includes("button"));
      expectTrue(SCOPE_SELECTORS.button.includes(".button"));
      expectTrue(SCOPE_SELECTORS.button.includes('input[type="submit"]'));
    },
  },
];

// ============================================
// Round-trip tests
// ============================================

const roundTripTests = [
  {
    name: "roundtrip-parse-generate",
    description: "Parsing and regenerating produces equivalent output",
    test: () => {
      const originalTheme = `
:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
}

header {
  --color-text: #ffffff;
}

/* body_classes: header-centered-dark */
      `;

      const parsed = parseThemeContent(originalTheme);
      const generated = generateThemeCss(
        parsed.root,
        parsed.scopes,
        parsed.bodyClasses,
      );
      const reparsed = parseThemeContent(generated);

      expectDeepEqual(reparsed.root, parsed.root);
      expectDeepEqual(reparsed.scopes, parsed.scopes);
      expectDeepEqual(reparsed.bodyClasses, parsed.bodyClasses);
    },
  },
  {
    name: "adding-scopes-to-minimal-theme",
    description: "Can add new scopes to a theme that had none",
    test: () => {
      const minimalTheme = `:root { --color-bg: #ffffff; }`;
      const parsed = parseThemeContent(minimalTheme);

      const newScopeVars = {
        header: { "--color-text": "#ffffff" },
        nav: { "--color-bg": "#333333" },
      };

      const generated = generateThemeCss(parsed.root, newScopeVars, []);

      expectTrue(generated.includes("header {"));
      expectTrue(generated.includes("nav {"));
      expectTrue(generated.includes("--color-text: #ffffff;"));
      expectTrue(generated.includes("--color-bg: #333333;"));
    },
  },
];

// ============================================
// JSDOM Helpers
// ============================================

function generateFormHtml() {
  let html = "";

  Object.entries(GLOBAL_INPUTS).forEach(([id, config]) => {
    if (config.type === "color") {
      html += `<input type="color" id="${id}" data-var="--${id}">\n`;
    }
  });

  getScopes().forEach((scope) => {
    Object.entries(SCOPED_INPUTS).forEach(([id, config]) => {
      if (config.type === "color") {
        html += `<input type="color" id="${scope}-${id}" data-var="--${id}" data-scope="${scope}">\n`;
      } else if (config.type === "border") {
        html += `<input type="number" id="${scope}-border-width">\n`;
        html += `<select id="${scope}-border-style"></select>\n`;
        html += `<input type="color" id="${scope}-border-color">\n`;
        html += `<input type="hidden" id="${scope}-${id}" data-var="--${id}" data-scope="${scope}">\n`;
      }
    });
  });

  return html;
}

function createMockDOM(themeContent = "") {
  const formInputsHtml = generateFormHtml();

  const html = `
<!DOCTYPE html>
<html>
<head><style>:root { --color-bg: #ffffff; --color-text: #333333; --color-link: #0066cc; --color-link-hover: #004499; }</style></head>
<body>
  <form id="theme-editor-form">
    ${formInputsHtml}
  </form>
  <textarea id="theme-output">${themeContent}</textarea>
</body>
</html>`;

  return new JSDOM(html, { runScripts: "dangerously" });
}

// ============================================
// E2E Tests with JSDOM
// ============================================

const e2eTests = [
  {
    name: "e2e-paste-and-initialize-theme",
    description: "Pasting a theme correctly initializes all inputs",
    test: () => {
      const theme = `
:root {
  --color-bg: #ffffff;
  --color-text: #333333;
  --color-link: #0066cc;
  --color-link-hover: #004499;
}

header {
  --color-bg: #ff0000;
  --color-text: #ffffff;
}

nav {
  --color-link: #00ff00;
}
`;
      const dom = createMockDOM(theme);
      const { document } = dom.window;
      const form = document.getElementById("theme-editor-form");
      const parsed = parseThemeContent(theme);

      // Initialize inputs from parsed theme
      getScopes().forEach((scope) => {
        const scopeVars = parsed.scopes[scope] || {};
        form
          .querySelectorAll(`input[type="color"][data-scope="${scope}"]`)
          .forEach((input) => {
            const varName = input.dataset.var;
            if (scopeVars[varName]) {
              input.value = scopeVars[varName];
            } else {
              const globalValue = parsed.root[varName];
              if (globalValue?.startsWith("#")) {
                input.value = globalValue;
              }
            }
          });
      });

      // Verify header scope (has overrides)
      expectStrictEqual(
        document.getElementById("header-color-bg").value,
        "#ff0000",
      );
      expectStrictEqual(
        document.getElementById("header-color-text").value,
        "#ffffff",
      );
      expectStrictEqual(
        document.getElementById("header-color-link").value,
        "#0066cc",
      );

      // Verify nav scope (one override)
      expectStrictEqual(
        document.getElementById("nav-color-link").value,
        "#00ff00",
      );
      expectStrictEqual(
        document.getElementById("nav-color-bg").value,
        "#ffffff",
      );

      // Verify article scope (no overrides, all global)
      expectStrictEqual(
        document.getElementById("article-color-bg").value,
        "#ffffff",
      );
    },
  },
  {
    name: "e2e-modify-and-generate",
    description: "Modifying inputs and generating CSS produces correct output",
    test: () => {
      const originalTheme = `
:root {
  --color-bg: #ffffff;
  --color-text: #000000;
  --color-link: #0000ff;
  --color-link-hover: #0000cc;
}

header {
  --color-bg: #333333;
}
`;
      const dom = createMockDOM(originalTheme);
      const { document } = dom.window;
      const form = document.getElementById("theme-editor-form");
      const parsed = parseThemeContent(originalTheme);

      // Initialize inputs
      getScopes().forEach((scope) => {
        const scopeVars = parsed.scopes[scope] || {};
        form
          .querySelectorAll(`input[type="color"][data-scope="${scope}"]`)
          .forEach((input) => {
            const varName = input.dataset.var;
            if (scopeVars[varName]) {
              input.value = scopeVars[varName];
            } else {
              const globalValue = parsed.root[varName];
              if (globalValue?.startsWith("#")) {
                input.value = globalValue;
              }
            }
          });
      });

      // User modifies values
      document.getElementById("header-color-bg").value = "#ff0000";
      document.getElementById("nav-color-link").value = "#00ff00";

      // Collect scope vars
      const scopeVars = {};
      getScopes().forEach((scope) => {
        const vars = {};
        form
          .querySelectorAll(`input[type="color"][data-scope="${scope}"]`)
          .forEach((input) => {
            const varName = input.dataset.var;
            const value = input.value;
            const globalValue = parsed.root[varName];
            if (shouldIncludeScopedVar(value, globalValue)) {
              vars[varName] = value;
            }
          });
        if (Object.keys(vars).length > 0) {
          scopeVars[scope] = vars;
        }
      });

      // Generate new CSS
      const newCss = generateThemeCss(parsed.root, scopeVars, []);

      expectTrue(newCss.includes(":root {"));
      expectTrue(newCss.includes("header {"));
      expectTrue(newCss.includes("--color-bg: #ff0000"));
      expectTrue(newCss.includes("nav {"));
      expectTrue(newCss.includes("--color-link: #00ff00"));
      expectFalse(newCss.includes("article {"));
    },
  },
  {
    name: "e2e-only-changed-values-collected",
    description: "Only inputs that differ from global appear in output",
    test: () => {
      const dom = createMockDOM();
      const { document } = dom.window;
      const form = document.getElementById("theme-editor-form");

      const globalValues = {
        "--color-bg": "#ffffff",
        "--color-text": "#333333",
        "--color-link": "#0066cc",
        "--color-link-hover": "#004499",
      };

      // Initialize all scopes to global values
      getScopes().forEach((scope) => {
        form
          .querySelectorAll(`input[type="color"][data-scope="${scope}"]`)
          .forEach((input) => {
            const varName = input.dataset.var;
            const globalValue = globalValues[varName];
            if (globalValue) input.value = globalValue;
          });
      });

      // Change specific values
      document.getElementById("header-color-bg").value = "#ff0000";
      document.getElementById("nav-color-link").value = "#00ff00";
      document.getElementById("article-color-text").value = "#0000ff";

      // Collect vars for each scope
      const collectedByScope = {};
      getScopes().forEach((scope) => {
        const vars = {};
        form
          .querySelectorAll(`input[type="color"][data-scope="${scope}"]`)
          .forEach((input) => {
            const varName = input.dataset.var;
            const value = input.value;
            const globalValue = globalValues[varName];
            if (shouldIncludeScopedVar(value, globalValue)) {
              vars[varName] = value;
            }
          });
        collectedByScope[scope] = vars;
      });

      expectDeepEqual(collectedByScope.header, { "--color-bg": "#ff0000" });
      expectDeepEqual(collectedByScope.nav, { "--color-link": "#00ff00" });
      expectDeepEqual(collectedByScope.article, { "--color-text": "#0000ff" });
      expectDeepEqual(collectedByScope.form, {});
      expectDeepEqual(collectedByScope.button, {});
    },
  },
  {
    name: "e2e-black-preserved-when-intentional",
    description: "Black (#000000) is preserved when intentionally set",
    test: () => {
      const theme = `
:root {
  --color-bg: #ffffff;
  --color-text: #333333;
}

header {
  --color-bg: #000000;
  --color-text: #ffffff;
}
`;
      const dom = createMockDOM(theme);
      const { document } = dom.window;
      const form = document.getElementById("theme-editor-form");
      const parsed = parseThemeContent(theme);

      // Initialize header inputs
      const headerVars = parsed.scopes.header || {};
      form
        .querySelectorAll('input[type="color"][data-scope="header"]')
        .forEach((input) => {
          const varName = input.dataset.var;
          if (headerVars[varName]) {
            input.value = headerVars[varName];
          } else {
            const globalValue = parsed.root[varName];
            if (globalValue?.startsWith("#")) {
              input.value = globalValue;
            }
          }
        });

      expectStrictEqual(
        document.getElementById("header-color-bg").value,
        "#000000",
      );

      // Collect and verify black is preserved
      const collectedVars = {};
      form
        .querySelectorAll('input[type="color"][data-scope="header"]')
        .forEach((input) => {
          const varName = input.dataset.var;
          const value = input.value;
          const globalValue = parsed.root[varName];
          if (shouldIncludeScopedVar(value, globalValue)) {
            collectedVars[varName] = value;
          }
        });

      expectStrictEqual(collectedVars["--color-bg"], "#000000");
      expectStrictEqual(collectedVars["--color-text"], "#ffffff");
    },
  },
  {
    name: "e2e-full-round-trip",
    description: "Full round-trip: parse → initialize → collect → generate",
    test: () => {
      const originalTheme = `
:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
  --color-link: #f6f5f4;
  --color-link-hover: #ffffff;
}

header {
  --color-bg: #3d3846;
  --color-text: #ffffff;
}

nav {
  --color-bg: #1a1a1a;
  --color-link: #ffcc00;
}

button,
.button,
input[type="submit"] {
  --color-bg: #62a0ea;
  --color-text: #000000;
}

/* body_classes: header-centered-dark */
`;
      const dom = createMockDOM(originalTheme);
      const { document } = dom.window;
      const form = document.getElementById("theme-editor-form");
      const parsed = parseThemeContent(originalTheme);

      // Initialize all inputs from parsed theme
      getScopes().forEach((scope) => {
        const scopeVars = parsed.scopes[scope] || {};
        form
          .querySelectorAll(`input[type="color"][data-scope="${scope}"]`)
          .forEach((input) => {
            const varName = input.dataset.var;
            if (scopeVars[varName]) {
              input.value = scopeVars[varName];
            } else {
              const globalValue = parsed.root[varName];
              if (globalValue?.startsWith("#")) {
                input.value = globalValue;
              }
            }
          });
      });

      // Collect scope vars without modification
      const collectedScopeVars = {};
      getScopes().forEach((scope) => {
        const vars = {};
        form
          .querySelectorAll(`input[type="color"][data-scope="${scope}"]`)
          .forEach((input) => {
            const varName = input.dataset.var;
            const value = input.value;
            const globalValue = parsed.root[varName];
            if (shouldIncludeScopedVar(value, globalValue)) {
              vars[varName] = value;
            }
          });
        if (Object.keys(vars).length > 0) {
          collectedScopeVars[scope] = vars;
        }
      });

      // Generate new CSS
      const generatedCss = generateThemeCss(
        parsed.root,
        collectedScopeVars,
        parsed.bodyClasses,
      );

      // Re-parse the generated CSS
      const reparsed = parseThemeContent(generatedCss);

      expectDeepEqual(reparsed.root, parsed.root);
      expectDeepEqual(reparsed.scopes.header, parsed.scopes.header);
      expectDeepEqual(reparsed.scopes.nav, parsed.scopes.nav);
      expectDeepEqual(reparsed.scopes.button, parsed.scopes.button);
      expectDeepEqual(reparsed.bodyClasses, parsed.bodyClasses);
    },
  },
  {
    name: "e2e-generated-css-valid",
    description: "Generated CSS contains no undefined values",
    test: () => {
      const dom = createMockDOM();
      const { document } = dom.window;
      const form = document.getElementById("theme-editor-form");

      const globalVars = {
        "--color-bg": "#ffffff",
        "--color-text": "#333333",
      };

      // Collect scope vars using correct query (includes [data-var])
      const scopeVars = {};
      getScopes().forEach((scope) => {
        const vars = {};
        form
          .querySelectorAll(
            `input[type="color"][data-var][data-scope="${scope}"]`,
          )
          .forEach((input) => {
            const varName = input.dataset.var;
            const value = input.value;
            if (shouldIncludeScopedVar(value, globalVars[varName])) {
              vars[varName] = value;
            }
          });
        if (Object.keys(vars).length > 0) {
          scopeVars[scope] = vars;
        }
      });

      const css = generateThemeCss(globalVars, scopeVars, []);

      expectFalse(css.includes("undefined"));
    },
  },
  {
    name: "e2e-border-initialization",
    description: "Scoped border inputs initialize correctly",
    test: () => {
      const dom = createMockDOM();
      const { document } = dom.window;

      const globalBorder = "2px solid #58648c";

      // Initialize all scopes to global
      getScopes().forEach((scope) => {
        const widthInput = document.getElementById(`${scope}-border-width`);
        const styleSelect = document.getElementById(`${scope}-border-style`);
        const colorInput = document.getElementById(`${scope}-border-color`);
        const outputInput = document.getElementById(`${scope}-border`);

        if (widthInput && styleSelect && colorInput && outputInput) {
          const match = globalBorder.match(/(\d+)px\s+(\w+)\s+(.+)/);
          if (match) {
            widthInput.value = match[1];
            styleSelect.value = match[2];
            colorInput.value = match[3];
            outputInput.value = globalBorder;
          }
        }
      });

      // Collect scope vars - borders should match global and be excluded
      const scopeVars = {};
      getScopes().forEach((scope) => {
        const vars = {};
        const borderOutput = document.getElementById(`${scope}-border`);
        if (borderOutput?.value) {
          if (shouldIncludeScopedVar(borderOutput.value, globalBorder)) {
            vars["--border"] = borderOutput.value;
          }
        }
        if (Object.keys(vars).length > 0) {
          scopeVars[scope] = vars;
        }
      });

      expectStrictEqual(Object.keys(scopeVars).length, 0);
    },
  },
];

// ============================================
// Bug regression tests
// ============================================

const exactOutputTests = [
  {
    name: "exact-output-global-only",
    description: "CSS output matches exactly when only global values are set",
    test: () => {
      const globalVars = {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
      };
      const scopeVars = {};
      const bodyClasses = [];

      const css = generateThemeCss(globalVars, scopeVars, bodyClasses);

      const expected = `:root {
  --color-bg: #ffffff;
  --color-text: #000000;
}
`;
      expectStrictEqual(css, expected, "CSS should match exactly");
    },
  },
  {
    name: "exact-output-with-one-scope",
    description: "CSS output matches exactly with one scope override",
    test: () => {
      const globalVars = {
        "--color-bg": "#ffffff",
        "--color-text": "#000000",
      };
      const scopeVars = {
        header: { "--color-text": "#ffffff" },
      };
      const bodyClasses = [];

      const css = generateThemeCss(globalVars, scopeVars, bodyClasses);

      const expected = `:root {
  --color-bg: #ffffff;
  --color-text: #000000;
}

header {
  --color-text: #ffffff;
}
`;
      expectStrictEqual(css, expected, "CSS should match exactly");
    },
  },
  {
    name: "exact-output-with-body-classes",
    description: "CSS output matches exactly with body classes",
    test: () => {
      const globalVars = {
        "--color-bg": "#ffffff",
      };
      const scopeVars = {};
      const bodyClasses = ["header-centered-dark", "main-boxed"];

      const css = generateThemeCss(globalVars, scopeVars, bodyClasses);

      const expected = `:root {
  --color-bg: #ffffff;
}

/* body_classes: header-centered-dark, main-boxed */`;
      expectStrictEqual(css, expected, "CSS should match exactly");
    },
  },
  {
    name: "exact-output-with-button-scope",
    description: "CSS output has correct multi-line button selector",
    test: () => {
      const globalVars = {
        "--color-bg": "#ffffff",
      };
      const scopeVars = {
        button: { "--color-bg": "#007bff" },
      };
      const bodyClasses = [];

      const css = generateThemeCss(globalVars, scopeVars, bodyClasses);

      const expected = `:root {
  --color-bg: #ffffff;
}

button,
.button,
input[type="submit"] {
  --color-bg: #007bff;
}
`;
      expectStrictEqual(css, expected, "CSS should match exactly");
    },
  },
  {
    name: "exact-output-full-theme",
    description: "Full theme CSS output matches exactly",
    test: () => {
      const globalVars = {
        "--color-bg": "#241f31",
        "--color-text": "#9a9996",
        "--color-link": "#f6f5f4",
      };
      const scopeVars = {
        header: { "--color-bg": "#3d3846", "--color-text": "#ffffff" },
        nav: { "--color-link": "#ffcc00" },
      };
      const bodyClasses = ["header-centered-dark"];

      const css = generateThemeCss(globalVars, scopeVars, bodyClasses);

      const expected = `:root {
  --color-bg: #241f31;
  --color-text: #9a9996;
  --color-link: #f6f5f4;
}

header {
  --color-bg: #3d3846;
  --color-text: #ffffff;
}

nav {
  --color-link: #ffcc00;
}

/* body_classes: header-centered-dark */`;
      expectStrictEqual(css, expected, "CSS should match exactly");
    },
  },
];

const bugRegressionTests = [
  {
    name: "bug-changing-global-border-should-not-create-scope-overrides",
    description:
      "Changing a global border should not cause unchanged scoped borders to appear as overrides",
    test: () => {
      // This tests the bug: user loads theme with --border: 2px solid #000000,
      // then changes global border to 3px solid #ff0000.
      // The scoped borders (header, nav, article, form) were initialized to old border
      // but should NOT appear in output since user never changed them.

      const originalTheme = `
:root {
  --color-bg: #ffffff;
  --color-text: #333333;
  --border: 2px solid #000000;
}
`;
      const dom = createMockDOM(originalTheme);
      const { document } = dom.window;
      const form = document.getElementById("theme-editor-form");
      const parsed = parseThemeContent(originalTheme);

      const oldGlobalBorder = parsed.root["--border"];

      // Step 1: Initialize scoped border inputs to global value (simulating page load)
      getScopes().forEach((scope) => {
        const borderOutput = document.getElementById(`${scope}-border`);
        const widthInput = document.getElementById(`${scope}-border-width`);
        const styleSelect = document.getElementById(`${scope}-border-style`);
        const colorInput = document.getElementById(`${scope}-border-color`);

        if (borderOutput && widthInput && styleSelect && colorInput) {
          const match = oldGlobalBorder.match(/(\d+)px\s+(\w+)\s+(.+)/);
          if (match) {
            widthInput.value = match[1];
            styleSelect.value = match[2];
            colorInput.value = match[3];
            borderOutput.value = oldGlobalBorder;
          }
        }
      });

      // Verify scoped borders are initialized to old global value
      expectStrictEqual(
        document.getElementById("nav-border").value,
        "2px solid #000000",
      );

      // Step 2: User changes the GLOBAL border to a new value
      const newGlobalBorder = "3px solid #ff0000";

      // Step 3: Build new global vars (simulating what updateThemeFromControls does)
      const oldGlobalVars = {
        "--border": oldGlobalBorder,
      };
      const newGlobalVars = {
        "--color-bg": "#ffffff",
        "--color-text": "#333333",
        "--border": newGlobalBorder,
      };

      // Step 4: CASCADE global changes to scoped inputs (THE FIX)
      // For each scoped border, if it equals the OLD global value, update to NEW global value
      getScopes().forEach((scope) => {
        const borderOutput = document.getElementById(`${scope}-border`);
        if (borderOutput) {
          const oldGlobal = oldGlobalVars["--border"];
          const newGlobal = newGlobalVars["--border"];
          if (oldGlobal && newGlobal && borderOutput.value === oldGlobal) {
            // Update border component inputs too
            const widthInput = document.getElementById(`${scope}-border-width`);
            const styleSelect = document.getElementById(
              `${scope}-border-style`,
            );
            const colorInput = document.getElementById(`${scope}-border-color`);
            const match = newGlobal.match(/(\d+)px\s+(\w+)\s+(.+)/);
            if (match && widthInput && styleSelect && colorInput) {
              widthInput.value = match[1];
              styleSelect.value = match[2];
              colorInput.value = match[3];
            }
            borderOutput.value = newGlobal;
          }
        }
      });

      // Verify cascade worked - scoped borders now have new global value
      expectStrictEqual(
        document.getElementById("nav-border").value,
        "3px solid #ff0000",
      );

      // Step 5: Collect scope vars - now scoped borders match new global
      const scopeVars = {};
      getScopes().forEach((scope) => {
        const vars = {};
        // Check border
        const borderOutput = document.getElementById(`${scope}-border`);
        if (borderOutput?.value) {
          if (
            shouldIncludeScopedVar(
              borderOutput.value,
              newGlobalVars["--border"],
            )
          ) {
            vars["--border"] = borderOutput.value;
          }
        }
        if (Object.keys(vars).length > 0) {
          scopeVars[scope] = vars;
        }
      });

      // Generate CSS
      const css = generateThemeCss(newGlobalVars, scopeVars, []);

      // With the fix: output should be EXACTLY this - no scope overrides
      const expected = `:root {
  --color-bg: #ffffff;
  --color-text: #333333;
  --border: 3px solid #ff0000;
}
`;
      expectStrictEqual(
        css,
        expected,
        "Output should contain only :root, no scope overrides for border",
      );
    },
  },
  {
    name: "bug-changing-global-should-not-create-scope-overrides",
    description:
      "Changing a global value should not cause unchanged scoped inputs to appear as overrides",
    test: () => {
      // This tests the bug: user loads theme with --color-text: #9a9996,
      // then changes global text color to #000000.
      // The scoped inputs (nav, article, form) were initialized to #9a9996
      // but should NOT appear in output since user never changed them.
      //
      // THE FIX: When global changes, cascade the change to scoped inputs
      // that were "following" the old global value.

      const originalTheme = `
:root {
  --color-bg: #ffffff;
  --color-text: #9a9996;
  --color-link: #0066cc;
  --color-link-hover: #004499;
}
`;
      const dom = createMockDOM(originalTheme);
      const { document } = dom.window;
      const form = document.getElementById("theme-editor-form");
      const parsed = parseThemeContent(originalTheme);

      // Step 1: Initialize scoped inputs to global values (simulating page load)
      const oldGlobalVars = { ...parsed.root };
      getScopes().forEach((scope) => {
        form
          .querySelectorAll(`input[type="color"][data-scope="${scope}"]`)
          .forEach((input) => {
            const varName = input.dataset.var;
            const globalValue = parsed.root[varName];
            if (globalValue?.startsWith("#")) {
              input.value = globalValue;
            }
          });
      });

      // Verify scoped inputs are initialized to old global value
      expectStrictEqual(
        document.getElementById("nav-color-text").value,
        "#9a9996",
      );

      // Step 2: User changes the GLOBAL text color to a new value
      const newGlobalTextColor = "#000000";
      document.getElementById("color-text").value = newGlobalTextColor;

      // Step 3: Update the global vars (simulating what updateThemeFromControls does)
      const newGlobalVars = {
        "--color-bg": "#ffffff",
        "--color-text": newGlobalTextColor, // NEW value
        "--color-link": "#0066cc",
        "--color-link-hover": "#004499",
      };

      // Step 4: CASCADE global changes to scoped inputs (THE FIX)
      // For each scoped input, if it equals the OLD global value, update to NEW global value
      getScopes().forEach((scope) => {
        form
          .querySelectorAll(`input[type="color"][data-scope="${scope}"]`)
          .forEach((input) => {
            const varName = input.dataset.var;
            const oldGlobal = oldGlobalVars[varName];
            const newGlobal = newGlobalVars[varName];
            // If scoped input was following old global, update to new global
            if (oldGlobal && newGlobal && input.value === oldGlobal) {
              input.value = newGlobal;
            }
          });
      });

      // Verify cascade worked - scoped inputs now have new global value
      expectStrictEqual(
        document.getElementById("nav-color-text").value,
        "#000000",
      );

      // Step 5: Collect scope vars - now scoped inputs match new global
      const scopeVars = {};
      getScopes().forEach((scope) => {
        const vars = {};
        form
          .querySelectorAll(`input[type="color"][data-scope="${scope}"]`)
          .forEach((input) => {
            const varName = input.dataset.var;
            const value = input.value;
            const globalValue = newGlobalVars[varName];
            if (shouldIncludeScopedVar(value, globalValue)) {
              vars[varName] = value;
            }
          });
        if (Object.keys(vars).length > 0) {
          scopeVars[scope] = vars;
        }
      });

      // Generate CSS
      const css = generateThemeCss(newGlobalVars, scopeVars, []);

      // With the fix: output should be EXACTLY this - no scope overrides
      const expected = `:root {
  --color-bg: #ffffff;
  --color-text: #000000;
  --color-link: #0066cc;
  --color-link-hover: #004499;
}
`;
      expectStrictEqual(
        css,
        expected,
        "Output should contain only :root, no scope overrides",
      );
    },
  },
];

// ============================================
// Combine and run all tests
// ============================================

const allTestCases = [
  ...parsingTests,
  ...generationTests,
  ...scopeFilterTests,
  ...configTests,
  ...roundTripTests,
  ...e2eTests,
  ...exactOutputTests,
  ...bugRegressionTests,
];

createTestRunner("theme-editor", allTestCases);
