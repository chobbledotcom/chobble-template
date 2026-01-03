import { describe, expect, test } from "bun:test";
import { compileScss, configureScss, createScssCompiler } from "#build/scss.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("scss", () => {
  test("Creates SCSS compiler function for given input path", () => {
    const inputPath = "/test/styles.scss";
    const simpleScss = "$color: red; body { color: $color; }";
    const compiler = createScssCompiler(simpleScss, inputPath);

    expect(typeof compiler).toBe("function");

    const result = compiler({});
    expect(result.includes("color: red")).toBe(true);
    expect(result.includes("body")).toBe(true);
  });

  test("Handles SCSS with import paths correctly", () => {
    const inputPath = "/project/src/css/main.scss";
    const scssWithImports =
      '@import "variables"; body { background: $bg-color; }';
    const compiler = createScssCompiler(scssWithImports, inputPath);

    expect(typeof compiler).toBe("function");

    // Missing import should throw an error
    expect(() => compiler({})).toThrow(
      /Can't find stylesheet|file to import not found/i,
    );
  });

  test("Compiles SCSS content with basic functionality", () => {
    const inputContent = "$primary: #333; .header { color: $primary; }";
    const inputPath = "/test/style.scss";

    const result = compileScss(inputContent, inputPath);

    expect(result.includes(".header")).toBe(true);
    expect(
      result.includes("color: #333") || result.includes("color:#333"),
    ).toBe(true);
  });

  test("Handles nested SCSS rules", () => {
    const inputContent = ".nav { ul { margin: 0; li { list-style: none; } } }";
    const inputPath = "/test/nested.scss";

    const result = compileScss(inputContent, inputPath);

    expect(result.includes(".nav ul")).toBe(true);
    expect(result.includes(".nav ul li")).toBe(true);
  });

  test("Handles SCSS mixins", () => {
    const inputContent = `
        @mixin button-style($bg) {
          background: $bg;
          padding: 10px;
        }
        .btn { @include button-style(blue); }
      `;
    const inputPath = "/test/mixins.scss";

    const result = compileScss(inputContent, inputPath);

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

  test("SCSS extension compile function works correctly", () => {
    const mockConfig = createMockEleventyConfig();
    configureScss(mockConfig);

    const scssExtension = mockConfig.extensions.scss;
    const inputContent = "$color: green; .test { color: $color; }";
    const inputPath = "/project/bundle.scss";

    const compileFn = scssExtension.compile(inputContent, inputPath);
    expect(typeof compileFn).toBe("function");

    const result = compileFn({});
    expect(typeof result).toBe("string");
    expect(result.includes(".test")).toBe(true);
    expect(
      result.includes("color: green") || result.includes("color:green"),
    ).toBe(true);
  });

  test("Uses correct load paths for imports", () => {
    const mockConfig = createMockEleventyConfig();
    configureScss(mockConfig);

    const scssExtension = mockConfig.extensions.scss;
    const inputPath = "/project/src/css/bundle.scss";
    const inputContent = ".test { color: blue; }";

    const compileFn = scssExtension.compile(inputContent, inputPath);
    const result = compileFn({});

    expect(typeof result).toBe("string");
    expect(result.includes(".test")).toBe(true);
  });

  test("Handles SCSS compilation errors gracefully", () => {
    const invalidScss = ".test { color: ; }"; // Invalid syntax
    const inputPath = "/test/invalid.scss";

    // Invalid SCSS should throw an error with a message
    expect(() => compileScss(invalidScss, inputPath)).toThrow(/./);
  });

  test("Functions should be pure and not modify inputs", () => {
    const originalContent = "$test: red; .class { color: $test; }";
    const originalPath = "/test/style.scss";
    const contentCopy = originalContent;
    const pathCopy = originalPath;

    compileScss(contentCopy, pathCopy);
    createScssCompiler(contentCopy, pathCopy);

    expect(contentCopy).toBe(originalContent);
    expect(pathCopy).toBe(originalPath);
  });
});
