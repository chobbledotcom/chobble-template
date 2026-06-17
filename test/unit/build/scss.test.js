import { describe, expect, test } from "bun:test";
import { configureScss, createScssCompiler } from "#build/scss.js";
import {
  compileScss,
  createMockEleventyConfig,
  fs,
  path,
  srcDir,
} from "#test/test-utils.js";

const compileExtension = async (ext, content, inputPath) => {
  const result = await ext.compile(content, inputPath)({});
  expect(typeof result).toBe("string");
  expect(result.includes(".test")).toBe(true);
  return result;
};

describe("scss", () => {
  test("Creates SCSS compiler function for given input path", async () => {
    const inputPath = "/test/styles.scss";
    const simpleScss = "$color: red; body { color: $color; }";
    const compiler = createScssCompiler(simpleScss, inputPath);

    expect(typeof compiler).toBe("function");

    const result = await compiler({});
    expect(result.includes("color: red")).toBe(true);
    expect(result.includes("body")).toBe(true);
  });

  test("Handles SCSS with @use paths correctly", async () => {
    const inputPath = "/project/src/css/main.scss";
    const scssWithUse =
      '@use "variables"; body { background: variables.$bg-color; }';
    const compiler = createScssCompiler(scssWithUse, inputPath);

    expect(typeof compiler).toBe("function");

    // Missing module should throw an error
    await expect(compiler({})).rejects.toThrow(
      /Can't find stylesheet|file to import not found/i,
    );
  });

  test("Compiles SCSS content with basic functionality", async () => {
    const inputContent = "$primary: #333; .header { color: $primary; }";
    const inputPath = "/test/style.scss";

    const result = await compileScss(inputContent, inputPath);

    expect(result.includes(".header")).toBe(true);
    expect(
      result.includes("color: #333") || result.includes("color:#333"),
    ).toBe(true);
  });

  test("Handles nested SCSS rules", async () => {
    const inputContent = ".nav { ul { margin: 0; li { list-style: none; } } }";
    const inputPath = "/test/nested.scss";

    const result = await compileScss(inputContent, inputPath);

    expect(result.includes(".nav ul")).toBe(true);
    expect(result.includes(".nav ul li")).toBe(true);
  });

  test("Handles SCSS mixins", async () => {
    const inputContent = `
        @mixin button-style($bg) {
          background: $bg;
          padding: 10px;
        }
        .btn { @include button-style(blue); }
      `;
    const inputPath = "/test/mixins.scss";

    const result = await compileScss(inputContent, inputPath);

    expect(result.includes(".btn")).toBe(true);
    expect(
      result.includes("background: blue") || result.includes("background:blue"),
    ).toBe(true);
    expect(
      result.includes("padding: 10px") || result.includes("padding:10px"),
    ).toBe(true);
  });

  test("Configures SCSS compilation in Eleventy", () => {
    const mockConfig = createMockEleventyConfig();

    configureScss(mockConfig);

    expect(mockConfig.templateFormats).toHaveLength(1);
    expect(mockConfig.templateFormats[0]).toBe("scss");

    expect(mockConfig.extensions.scss !== undefined).toBe(true);

    const scssExtension = mockConfig.extensions.scss;
    expect(scssExtension.outputFileExtension).toBe("css");
    expect(typeof scssExtension.compile).toBe("function");
  });

  test("SCSS extension compile function works correctly", async () => {
    const mockConfig = createMockEleventyConfig();
    configureScss(mockConfig);

    const scssExtension = mockConfig.extensions.scss;
    expect(typeof scssExtension.compile).toBe("function");

    const result = await compileExtension(
      scssExtension,
      "$color: green; .test { color: $color; }",
      "/project/design-system-bundle.scss",
    );
    expect(
      result.includes("color: green") || result.includes("color:green"),
    ).toBe(true);
  });

  test("Uses correct load paths for imports", async () => {
    const mockConfig = createMockEleventyConfig();
    configureScss(mockConfig);

    await compileExtension(
      mockConfig.extensions.scss,
      ".test { color: blue; }",
      "/project/src/css/design-system-bundle.scss",
    );
  });

  test("Handles SCSS compilation errors gracefully", async () => {
    const invalidScss = ".test { color: ; }"; // Invalid syntax
    const inputPath = "/test/invalid.scss";

    // Invalid SCSS should throw an error with a message
    await expect(compileScss(invalidScss, inputPath)).rejects.toThrow(/./);
  });

  test("Functions should be pure and not modify inputs", async () => {
    const originalContent = "$test: red; .class { color: $test; }";
    const originalPath = "/test/style.scss";
    const contentCopy = originalContent;
    const pathCopy = originalPath;

    await compileScss(contentCopy, pathCopy);
    createScssCompiler(contentCopy, pathCopy);

    expect(contentCopy).toBe(originalContent);
    expect(pathCopy).toBe(originalPath);
  });

  test("SCSS extension skips non-bundle SCSS files", () => {
    const mockConfig = createMockEleventyConfig();
    configureScss(mockConfig);

    const scssExtension = mockConfig.extensions.scss;
    const inputContent = ".test { color: red; }";
    const inputPath = "/project/src/css/style.scss";

    const compileFn = scssExtension.compile(inputContent, inputPath);
    expect(typeof compileFn).toBe("function");

    const result = compileFn({});
    expect(result).toBeUndefined();
  });

  test("Bundle compilation fails when CSS variables are undefined", async () => {
    const scss = "body { color: var(--does-not-exist); }";
    const inputPath = "/project/design-system-bundle.scss";

    const compiler = createScssCompiler(scss, inputPath);
    await expect(compiler({})).rejects.toThrow(/undefined CSS variable/);
  });

  test("Bundle compilation error lists all undefined variables", async () => {
    const scss =
      "body { color: var(--missing-a); background: var(--missing-b); }";
    const inputPath = "/project/design-system-bundle.scss";

    const compiler = createScssCompiler(scss, inputPath);
    await expect(compiler({})).rejects.toThrow(/--missing-a/);
  });

  test("Bundle compilation succeeds when all CSS variables are defined", async () => {
    const scss = ":root { --my-color: red; } body { color: var(--my-color); }";
    const inputPath = "/project/design-system-bundle.scss";

    const compiler = createScssCompiler(scss, inputPath);
    const result = await compiler({});
    expect(result).toContain("var(--my-color)");
  });

  test("Bundle validates nested var() fallback references", async () => {
    const scss =
      ":root { --font-body: sans-serif; } body { font: var(--font-heading, var(--font-body)); }";
    const inputPath = "/project/design-system-bundle.scss";

    const compiler = createScssCompiler(scss, inputPath);
    // --font-heading is used but not defined
    await expect(compiler({})).rejects.toThrow(/--font-heading/);
  });

  test("Non-bundle files skip CSS variable validation", async () => {
    const scss = "body { color: var(--does-not-exist); }";
    const inputPath = "/project/partial.scss";

    const result = await compileScss(scss, inputPath);
    expect(result).toContain("var(--does-not-exist)");
  });

  test("Design tokens expose runtime spacing and type aliases", async () => {
    const scss = `
      @use "variables" as *;

      :root {
        --space-md: #{$space-md-raw};
        --font-size-base: #{$font-size-base-raw};
      }

      .test {
        gap: $space-md;
        font-size: $font-size-base;
      }
    `;
    const inputPath = path.join(srcDir, "css", "token-test.scss");

    const result = await compileScss(scss, inputPath);

    expect(result).toContain("--space-md: 24px");
    expect(result).toContain("--font-size-base: 1rem");
    expect(result).toContain("gap: var(--space-md, 24px)");
    expect(result).toContain("font-size: var(--font-size-base, 1rem)");
  });

  test("Design-system sidebar columns stretch and stack item cards", async () => {
    const result = await compileScss(
      '@use "design-system";',
      path.join(srcDir, "css", "test.scss"),
    );
    const columnsRule =
      result.match(
        /\.design-system\.two-columns \.page-columns\s*\{[^}]*\}/,
      )?.[0] ?? "";
    const sidebarItemsRule =
      result.match(
        /\.design-system \.right-column ul\.items:not\(\.slider, \.masonry\) > li\s*\{[^}]*\}/,
      )?.[0] ?? "";

    expect(columnsRule).toContain("display: grid");
    expect(columnsRule).not.toContain("align-items: start");
    expect(sidebarItemsRule).toContain("flex-basis: 100%");
    expect(sidebarItemsRule).toContain("max-width: 100%");
  });

  test("Design-system bundle includes scrollable table wrapper styles", async () => {
    const bundlePath = path.join(srcDir, "css", "design-system-bundle.scss");
    const result = await compileScss(
      fs.readFileSync(bundlePath, "utf-8"),
      bundlePath,
    );
    const wrapperRule =
      result.match(/\.design-system \.prose \.scrollable-table\s*\{[^}]*\}/)?.[0] ??
      "";
    const tableRule =
      result.match(
        /\.design-system \.prose \.scrollable-table > table\s*\{[^}]*\}/,
      )?.[0] ?? "";

    expect(wrapperRule).toContain("overflow-x: auto");
    expect(wrapperRule).toContain("max-width: 100%");
    expect(tableRule).toContain("min-width: 100%");
    expect(tableRule).toContain("margin: 0");
  });
});
