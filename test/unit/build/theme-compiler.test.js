import { describe, expect, test, vi } from "vitest";
import { generateThemeSwitcherContent } from "#build/theme-compiler.js";
import { bracketAsync } from "#test/test-utils.js";

const withTheme = bracketAsync(
  (content) => {
    vi.resetModules();
    vi.doMock("node:fs", async (importOriginal) => ({
      default: {
        ...(await importOriginal()).default,
        readdirSync: () => ["theme-fixture.scss"],
        readFileSync: () => content,
      },
    }));
  },
  () => {
    vi.doUnmock("node:fs");
    vi.resetModules();
  },
);

describe("theme-compiler", () => {
  describe("generateThemeSwitcherContent", () => {
    test("output includes warning header about auto-generation", () => {
      const result = generateThemeSwitcherContent();

      expect(result.includes("Auto-generated theme definitions")).toBe(true);
      expect(result.includes("DO NOT EDIT")).toBe(true);
    });

    test("generates html[data-theme] selectors for themes", () => {
      const result = generateThemeSwitcherContent();

      // Should have at least the ocean theme (known to exist)
      expect(result.includes('html[data-theme="ocean"]')).toBe(true);
    });

    test("theme selectors contain CSS variables", () => {
      const result = generateThemeSwitcherContent();

      // Ocean theme has --color-bg - verify it's in the ocean selector
      const oceanSelectorStart = result.indexOf('html[data-theme="ocean"]');
      const oceanSelectorEnd = result.indexOf("}", oceanSelectorStart);
      const oceanBlock = result.slice(oceanSelectorStart, oceanSelectorEnd);

      expect(oceanBlock.includes("--color-bg")).toBe(true);
    });

    test("generates --theme-list with default and theme names", () => {
      const result = generateThemeSwitcherContent();

      expect(result.includes("--theme-list:")).toBe(true);
      expect(result.includes('"default,')).toBe(true);
      expect(result.includes("ocean")).toBe(true);
    });

    test("generates display names for themes", () => {
      const result = generateThemeSwitcherContent();

      expect(result.includes('--theme-default-name: "Default"')).toBe(true);
      expect(result.includes('--theme-ocean-name: "Ocean"')).toBe(true);
      expect(result.includes('--theme-90s-computer-name: "90s Computer"')).toBe(
        true,
      );
    });

    test("excludes theme-editor from compiled themes", () => {
      const result = generateThemeSwitcherContent();

      expect(result.includes('data-theme="editor"')).toBe(false);
      expect(result.includes("--theme-editor-name")).toBe(false);
    });

    test("has metadata section with :root for JavaScript access", () => {
      const result = generateThemeSwitcherContent();

      expect(result.includes("Theme metadata for JavaScript access")).toBe(
        true,
      );

      // The metadata :root block should contain --theme-list
      const metadataStart = result.indexOf("Theme metadata");
      const afterMetadata = result.slice(metadataStart);
      expect(afterMetadata.includes(":root {")).toBe(true);
    });

    test.each([
      ["missing", "p { color: red; }"],
      ["block-commented", "/* :root { --color-bg: red; } */"],
      ["line-commented", "// :root { --color-bg: red; }"],
      ["quoted", 'p { content: ":root { --color-bg: red; }"; }'],
      ["empty", ":root {}"],
      ["whitespace-only", ":root { \n\t }"],
      [
        "comment-only",
        ":root { /* --color-bg: red; */\n // --color-text: blue;\n }",
      ],
    ])("rejects a %s :root block naming the theme file", (_label, content) =>
      withTheme(content, async () => {
        const fresh = await import("#build/theme-compiler.js");
        expect(() => fresh.generateThemeSwitcherContent()).toThrow(
          "Theme file theme-fixture.scss must define a non-empty :root block with theme variables",
        );
      }));

    test("ignores commented roots while preserving the first real root's full SCSS body", () =>
      withTheme(
        `
/* :root { --color-bg: fake; } */
// :root { --color-bg: also-fake; }
:root {
  // Keep SCSS comments, including a closing brace: }
  --color-bg: blue;
  --label: "}";
  color: red;
  @media (min-width: 40rem) { --color-bg: navy; }
}
:root { --color-bg: ignored; }
header { --color-bg: scoped; }
`,
        async () => {
          const fresh = await import("#build/theme-compiler.js");
          const result = fresh.generateThemeSwitcherContent();
          expect(result).toContain(`html[data-theme="fixture"] {
  // Keep SCSS comments, including a closing brace: }
  --color-bg: blue;
  --label: "}";
  color: red;
  @media (min-width: 40rem) { --color-bg: navy; }
}`);
          expect(result).not.toMatch(/fake|ignored|scoped/);
          expect(result).toContain('--theme-list: "default,fixture";');
        },
      ));

    test("does not require custom properties when the root has other SCSS content", () =>
      withTheme(":root { color: red; }", async () => {
        const fresh = await import("#build/theme-compiler.js");
        expect(fresh.generateThemeSwitcherContent()).toContain(
          'html[data-theme="fixture"] { color: red; }',
        );
      }));

    test("reports the theme file when its SCSS is malformed", () =>
      withTheme(":root { --color-bg: red;", async () => {
        const fresh = await import("#build/theme-compiler.js");
        expect(() => fresh.generateThemeSwitcherContent()).toThrow(
          /theme-fixture\.scss.*Unclosed block/,
        );
      }));
  });
});
