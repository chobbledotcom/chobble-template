import { afterEach, describe, expect, test, vi } from "vitest";
import { configureScss } from "#build/scss.js";
import * as configModule from "#data/config.js";
import {
  compileScss,
  createMockEleventyConfig,
  fs,
  path,
  srcDir,
  withTempDirAsync,
} from "#test/test-utils.js";

// These tests run real sass compilations, which can far exceed the global
// 1.5s testTimeout when the full suite's lanes load the machine.
vi.setConfig({ testTimeout: 15_000 });
afterEach(() => vi.restoreAllMocks());

const compileDesignSystemBundle = async () => {
  const bundlePath = path.join(srcDir, "css", "design-system-bundle.scss");
  return compileScss(fs.readFileSync(bundlePath, "utf-8"), bundlePath);
};

describe("scss", () => {
  test("Compiles SCSS variables through the registered extension", async () => {
    const inputPath = "/test/design-system-bundle.scss";
    const simpleScss = "$color: red; body { color: $color; }";
    const result = await compileScss(simpleScss, inputPath);
    expect(result.includes("color: red")).toBe(true);
    expect(result.includes("body")).toBe(true);
  });

  test("Rejects missing @use modules", async () => {
    const inputPath = "/project/src/css/design-system-bundle.scss";
    const scssWithUse =
      '@use "variables"; body { background: variables.$bg-color; }';
    await expect(compileScss(scssWithUse, inputPath)).rejects.toThrow(
      /Can't find stylesheet|file to import not found/i,
    );
  });

  test("Compiles SCSS content with basic functionality", async () => {
    const inputContent = "$primary: #333; .header { color: $primary; }";
    const inputPath = "/test/design-system-bundle.scss";

    const result = await compileScss(inputContent, inputPath);

    expect(result.includes(".header")).toBe(true);
    expect(
      result.includes("color: #333") || result.includes("color:#333"),
    ).toBe(true);
  });

  test("emits font URLs relative to the compiled stylesheet", async () => {
    const css = await compileDesignSystemBundle();
    expect(css).toContain('url("../assets/fonts/');
    expect(css).not.toContain('url("/assets/fonts/');
  });

  test("Handles nested SCSS rules", async () => {
    const inputContent = ".nav { ul { margin: 0; li { list-style: none; } } }";
    const inputPath = "/test/design-system-bundle.scss";

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
    const inputPath = "/test/design-system-bundle.scss";

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
    expect(scssExtension.useLayouts).toBe(false);
    expect(typeof scssExtension.compile).toBe("function");
    expect(mockConfig.watchTargets).toContain("./src/css/");
  });

  test("SCSS extension compile function works correctly", async () => {
    const mockConfig = createMockEleventyConfig();
    configureScss(mockConfig);

    const scssExtension = mockConfig.extensions.scss;
    expect(typeof scssExtension.compile).toBe("function");

    const result = await scssExtension.compile(
      "$color: green; .test { color: $color; }",
      "/project/design-system-bundle.scss",
    )({});
    expect(result).toContain(".test");
    expect(
      result.includes("color: green") || result.includes("color:green"),
    ).toBe(true);
  });

  test("Uses correct load paths for imports", async () => {
    await withTempDirAsync("scss-load-path", async (dir) => {
      fs.writeFileSync(path.join(dir, "_palette.scss"), "$color: blue;");
      const result = await compileScss(
        '@use "palette"; .test { color: palette.$color; }',
        path.join(dir, "design-system-bundle.scss"),
      );
      expect(result).toContain("color: blue");
    });
  });

  test("Handles SCSS compilation errors gracefully", async () => {
    const invalidScss = ".test { color: ; }"; // Invalid syntax
    const inputPath = "/test/design-system-bundle.scss";

    // Invalid SCSS should throw an error with a message
    await expect(compileScss(invalidScss, inputPath)).rejects.toThrow(/./);
  });

  test.each([
    "style.scss",
    "_partial.scss",
    "design-system-bundle.scss.bak",
  ])("SCSS extension skips %s even when its syntax is invalid", (filename) => {
    const mockConfig = createMockEleventyConfig();
    configureScss(mockConfig);

    const scssExtension = mockConfig.extensions.scss;
    const inputContent = ".test { color: ; }";
    const inputPath = `/project/src/css/${filename}`;

    const compileFn = scssExtension.compile(inputContent, inputPath);
    expect(typeof compileFn).toBe("function");

    const result = compileFn({});
    expect(result).toBeUndefined();
  });

  test("Bundle compilation fails when CSS variables are undefined", async () => {
    const scss = "body { color: var(--does-not-exist); }";
    const inputPath = "/project/design-system-bundle.scss";

    await expect(compileScss(scss, inputPath)).rejects.toThrow(
      /undefined CSS variable/,
    );
  });

  test("Bundle compilation error lists all undefined variables", async () => {
    const scss =
      "body { color: var(--missing-a); background: var(--missing-b); }";
    const inputPath = "/project/design-system-bundle.scss";

    await expect(compileScss(scss, inputPath)).rejects.toThrow(
      /--missing-a[\s\S]*--missing-b/,
    );
  });

  test("Bundle compilation succeeds when all CSS variables are defined", async () => {
    const scss = ":root { --my-color: red; } body { color: var(--my-color); }";
    const inputPath = "/project/design-system-bundle.scss";

    const result = await compileScss(scss, inputPath);
    expect(result).toContain("var(--my-color)");
  });

  test("Bundle validates nested var() fallback references", async () => {
    const scss =
      ":root { --font-body: sans-serif; } body { font: var(--font-heading, var(--font-body)); }";
    const inputPath = "/project/design-system-bundle.scss";

    // --font-heading is used but not defined
    await expect(compileScss(scss, inputPath)).rejects.toThrow(
      /--font-heading/,
    );
  });

  test("Non-bundle files with undefined CSS variables produce no output", async () => {
    const scss = "body { color: var(--does-not-exist); }";
    const inputPath = "/project/partial.scss";

    const result = await compileScss(scss, inputPath);
    expect(result).toBeUndefined();
  });

  test.each([
    true,
    false,
  ])("Theme switcher output follows enabled=%s", async (enabled) => {
    vi.spyOn(configModule, "default").mockReturnValue({
      enable_theme_switcher: enabled,
    });
    const result = await compileScss(
      "body { color: red; }",
      "/test/design-system-bundle.scss",
    );
    expect(result).toContain("color: red");
    if (enabled) {
      expect(result).toContain('html[data-theme="');
      expect(result).toContain("--theme-list:");
    } else {
      expect(result).not.toContain("data-theme");
      expect(result).not.toContain("--theme-list:");
    }
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
    const inputPath = path.join(srcDir, "css", "design-system-bundle.scss");

    const result = await compileScss(scss, inputPath);

    expect(result).toContain("--space-md: 24px");
    expect(result).toContain("--font-size-base: 1rem");
    expect(result).toContain("gap: var(--space-md, 24px)");
    expect(result).toContain("font-size: var(--font-size-base, 1rem)");
  });

  test("Design-system sidebar columns stretch and stack item cards", async () => {
    const result = await compileDesignSystemBundle();
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
    const result = await compileDesignSystemBundle();
    const wrapperRule =
      result.match(
        /\.design-system \.prose \.scrollable-table\s*\{[^}]*\}/,
      )?.[0] ?? "";
    const tableRule =
      result.match(
        /\.design-system \.prose \.scrollable-table > table\s*\{[^}]*\}/,
      )?.[0] ?? "";

    expect(wrapperRule).toContain("overflow-x: auto");
    expect(wrapperRule).toContain("max-width: 100%");
    expect(tableRule).toContain("min-width: 100%");
    expect(tableRule).toContain("margin: 0");
  });

  test("Collapsed menu panel scrolls within the viewport", async () => {
    const result = await compileDesignSystemBundle();
    const menuRule =
      result.match(
        /\.design-system nav\.site-nav\[data-menu\]\[data-collapse=always\] \.site-menu\s*\{[^}]*\}/,
      )?.[0] ?? "";

    expect(menuRule).toContain("overflow-y: auto");
    expect(menuRule).toContain("overscroll-behavior-y: contain");
    expect(menuRule).toContain("max-height: calc(100dvh - 3rem)");
  });

  test("Closed menu panel is hidden, not just moved out of view", async () => {
    const result = await compileDesignSystemBundle();
    const panelRule =
      result.match(
        /\.design-system nav\.site-nav\[data-menu\]\[data-collapse=always\] \.site-menu\s*\{[^}]*\}/,
      )?.[0] ?? "";
    const openRule =
      result.match(
        /\.design-system nav\.site-nav\[data-menu\]\[data-collapse=always\]\[data-menu=open\] \.site-menu\s*\{[^}]*\}/,
      )?.[0] ?? "";

    expect(panelRule).toContain("visibility: hidden");
    expect(openRule).toContain("visibility: visible");
  });

  test("Mobile sticky nav positioning targets only the site header nav", async () => {
    const result = await compileDesignSystemBundle();

    const stickyBarRule =
      result.match(
        /\.design-system\.sticky-mobile-nav nav\.site-nav\s*\{[^}]*\}/,
      )?.[0] ?? "";
    expect(stickyBarRule).toContain("position: fixed");

    const unscopedBar = result.match(
      /\.design-system\.sticky-mobile-nav nav\s*\{/,
    );
    expect(unscopedBar).toBeNull();
  });

  test("Desktop horizontal nav positioning targets only the site header nav", async () => {
    const result = await compileDesignSystemBundle();

    const horizontalRules =
      result.match(
        /\.design-system\.horizontal-nav nav\.site-nav(:not\([^)]*\))?\s*\{[^}]*\}/g,
      ) ?? [];
    expect(
      horizontalRules.some((rule) => rule.includes("position: sticky")),
    ).toBe(true);

    const unscopedHorizontal = result.match(
      /\.design-system\.horizontal-nav nav\s*\{/,
    );
    expect(unscopedHorizontal).toBeNull();
  });

  test("Design-system bundle ships table-of-contents card styling", async () => {
    const result = await compileDesignSystemBundle();
    const tocRule =
      result.match(/\.design-system \.table-of-contents\s*\{[^}]*\}/)?.[0] ??
      "";

    expect(tocRule).toContain("border-radius");
    expect(tocRule).toContain("background");
  });

  test("Design-system bundle defines default link decoration tokens", async () => {
    const result = await compileDesignSystemBundle();
    const linkRule =
      result.match(/\.design-system a:not\(\.btn\)\s*\{[^}]*\}/)?.[0] ?? "";
    const hoverRule =
      result.match(/\.design-system a:not\(\.btn\):hover\s*\{[^}]*\}/)?.[0] ??
      "";

    expect(result).toContain("--link-decoration: none");
    expect(result).toContain("--link-decoration-hover: underline");
    expect(result).toContain("--link-decoration-style: solid");
    expect(linkRule).toContain("text-decoration: var(--link-decoration)");
    expect(linkRule).toContain(
      "text-decoration-style: var(--link-decoration-style)",
    );
    expect(hoverRule).toContain(
      "text-decoration: var(--link-decoration-hover)",
    );
  });
});
