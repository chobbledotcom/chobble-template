// Tests for layout-aliases.js
// Verifies Eleventy layout alias configuration from src/_layouts directory

import { configureLayoutAliases } from "#eleventy/layout-aliases.js";
import {
  cleanupTempDir,
  createMockEleventyConfig,
  createTempDir,
  createTempFile,
  createTestRunner,
  expectDeepEqual,
  expectStrictEqual,
  fs,
  path,
  withMockedCwd,
} from "#test/test-utils.js";

const testCases = [
  {
    name: "configureLayoutAliases-registers-html-files-as-aliases",
    description: "Registers layout aliases for each .html file in src/_layouts",
    test: () => {
      const tempDir = createTempDir("layout-aliases");
      const layoutsDir = path.join(tempDir, "src/_layouts");
      fs.mkdirSync(layoutsDir, { recursive: true });

      createTempFile(layoutsDir, "base.html", "<html></html>");
      createTempFile(layoutsDir, "product.html", "<html></html>");
      createTempFile(layoutsDir, "category.html", "<html></html>");

      try {
        const config = createMockEleventyConfig();
        const aliases = [];
        config.addLayoutAlias = (alias, file) => {
          aliases.push({ alias, file });
        };

        withMockedCwd(tempDir, () => {
          configureLayoutAliases(config);
        });

        expectStrictEqual(
          aliases.length,
          3,
          "Should register 3 layout aliases for 3 HTML files",
        );

        const aliasNames = aliases.map((a) => a.alias).sort();
        expectDeepEqual(
          aliasNames,
          ["base", "category", "product"],
          "Should strip .html extension for alias names",
        );

        const fileNames = aliases.map((a) => a.file).sort();
        expectDeepEqual(
          fileNames,
          ["base.html", "category.html", "product.html"],
          "Should preserve full filename for file parameter",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "configureLayoutAliases-ignores-non-html-files",
    description: "Only processes files ending in .html, ignores others",
    test: () => {
      const tempDir = createTempDir("layout-aliases-filter");
      const layoutsDir = path.join(tempDir, "src/_layouts");
      fs.mkdirSync(layoutsDir, { recursive: true });

      createTempFile(layoutsDir, "base.html", "<html></html>");
      createTempFile(layoutsDir, "README.md", "# Layouts");
      createTempFile(layoutsDir, "config.json", "{}");
      createTempFile(layoutsDir, ".gitkeep", "");
      createTempFile(layoutsDir, "partial.liquid", "{% block %}{% endblock %}");

      try {
        const config = createMockEleventyConfig();
        const aliases = [];
        config.addLayoutAlias = (alias, file) => {
          aliases.push({ alias, file });
        };

        withMockedCwd(tempDir, () => {
          configureLayoutAliases(config);
        });

        expectStrictEqual(
          aliases.length,
          1,
          "Should only register alias for .html file",
        );
        expectStrictEqual(
          aliases[0].alias,
          "base",
          "Should register base.html as 'base' alias",
        );
        expectStrictEqual(
          aliases[0].file,
          "base.html",
          "Should map to base.html file",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "configureLayoutAliases-handles-empty-directory",
    description: "Handles directory with no HTML files gracefully",
    test: () => {
      const tempDir = createTempDir("layout-aliases-empty");
      const layoutsDir = path.join(tempDir, "src/_layouts");
      fs.mkdirSync(layoutsDir, { recursive: true });

      createTempFile(layoutsDir, ".gitkeep", "");

      try {
        const config = createMockEleventyConfig();
        const aliases = [];
        config.addLayoutAlias = (alias, file) => {
          aliases.push({ alias, file });
        };

        withMockedCwd(tempDir, () => {
          configureLayoutAliases(config);
        });

        expectStrictEqual(
          aliases.length,
          0,
          "Should not register any aliases when no HTML files exist",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "configureLayoutAliases-handles-hyphenated-filenames",
    description: "Correctly handles layout files with hyphens in names",
    test: () => {
      const tempDir = createTempDir("layout-aliases-hyphens");
      const layoutsDir = path.join(tempDir, "src/_layouts");
      fs.mkdirSync(layoutsDir, { recursive: true });

      createTempFile(layoutsDir, "checkout-complete.html", "<html></html>");
      createTempFile(layoutsDir, "guide-category.html", "<html></html>");

      try {
        const config = createMockEleventyConfig();
        const aliases = [];
        config.addLayoutAlias = (alias, file) => {
          aliases.push({ alias, file });
        };

        withMockedCwd(tempDir, () => {
          configureLayoutAliases(config);
        });

        const aliasMap = Object.fromEntries(
          aliases.map((a) => [a.alias, a.file]),
        );

        expectStrictEqual(
          aliasMap["checkout-complete"],
          "checkout-complete.html",
          "Should preserve hyphens in alias name",
        );
        expectStrictEqual(
          aliasMap["guide-category"],
          "guide-category.html",
          "Should preserve hyphens in alias name",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
  {
    name: "configureLayoutAliases-uses-production-layouts-directory",
    description: "Reads from actual src/_layouts when cwd is project root",
    test: () => {
      const config = createMockEleventyConfig();
      const aliases = [];
      config.addLayoutAlias = (alias, file) => {
        aliases.push({ alias, file });
      };

      configureLayoutAliases(config);

      const hasBaseAlias = aliases.some(
        (a) => a.alias === "base" && a.file === "base.html",
      );
      expectStrictEqual(
        hasBaseAlias,
        true,
        "Should register 'base' alias from production layouts directory",
      );

      const hasProductsAlias = aliases.some(
        (a) => a.alias === "products" && a.file === "products.html",
      );
      expectStrictEqual(
        hasProductsAlias,
        true,
        "Should register 'products' alias from production layouts directory",
      );

      const allHtmlFiles = aliases.every((a) => a.file.endsWith(".html"));
      expectStrictEqual(
        allHtmlFiles,
        true,
        "All registered aliases should map to .html files",
      );
    },
  },
  {
    name: "configureLayoutAliases-calls-addLayoutAlias-method",
    description: "Uses eleventyConfig.addLayoutAlias to register aliases",
    test: () => {
      const tempDir = createTempDir("layout-aliases-method");
      const layoutsDir = path.join(tempDir, "src/_layouts");
      fs.mkdirSync(layoutsDir, { recursive: true });

      createTempFile(layoutsDir, "test.html", "<html></html>");

      try {
        const config = createMockEleventyConfig();
        let methodCalled = false;
        let calledWith = null;

        config.addLayoutAlias = (alias, file) => {
          methodCalled = true;
          calledWith = { alias, file };
        };

        withMockedCwd(tempDir, () => {
          configureLayoutAliases(config);
        });

        expectStrictEqual(
          methodCalled,
          true,
          "Should call addLayoutAlias on eleventyConfig",
        );
        expectStrictEqual(
          calledWith.alias,
          "test",
          "Should pass alias without .html extension",
        );
        expectStrictEqual(
          calledWith.file,
          "test.html",
          "Should pass original filename with .html extension",
        );
      } finally {
        cleanupTempDir(tempDir);
      }
    },
  },
];

export default createTestRunner("layout-aliases", testCases);
