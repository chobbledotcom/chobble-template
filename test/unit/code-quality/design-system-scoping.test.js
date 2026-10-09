// Design System CSS Scoping Test
// Ensures all design-system SCSS files have styles scoped to .design-system
// This prevents design-system styles from leaking to other pages

import scss from "postcss-scss";
import { describe, expect, test } from "vitest";
import { fs, getFiles, path, rootDir } from "#test/test-utils.js";
import { filter, flatMap, notMemberOf, pipe } from "#utils/fp/array.js";

const { readFileSync } = fs;
const { join, basename } = path;

// Get all SCSS files in the design-system directory
const DESIGN_SYSTEM_SCSS_FILES = getFiles(
  /^src\/css\/design-system\/_[^/]+\.scss$/,
);

// Files that are allowed to have unscoped content
// _index.scss only contains @forward statements
const ALLOWED_UNSCOPED_FILES = ["_index.scss"];

const INDEX_FILE = "src/css/design-system/_index.scss";

/** Extract active top-level @forward partial names in declaration order. */
const forwardedNames = (content) =>
  scss
    .parse(content)
    .nodes.filter((node) => node.type === "atrule" && node.name === "forward")
    .map((node) => {
      const match = node.params.match(/^(["'])(.*?)\1/s);
      if (!match) {
        throw node.error("Expected a quoted module URL in @forward");
      }
      return basename(match[2], ".scss").replace(/^_/, "");
    });

const stripCommentsAndImports = (content) => {
  const withoutComments = content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutComments
    .replace(/@(?:use|forward|import)\s+[^;]+;/g, "")
    .trim();
};

/**
 * Check if a file contains unscoped CSS rules.
 * Unscoped rules are those that appear outside of .design-system { }
 *
 * @param {string} content - SCSS file content
 * @returns {string[]} - Array of unscoped selectors found
 */
const findUnscopedSelectors = (content) => {
  // Remove comments (both single-line and multi-line) and @use/@forward/@import statements
  const withoutImports = stripCommentsAndImports(content);

  // Remove :root blocks (allowed for CSS custom property defaults)
  const withoutRoot = withoutImports
    .replace(/:root\s*\{(?:[^#}]|#\{[^}]*\}|#(?!\{))*\}/g, "")
    .trim();

  // If file is empty after removing imports/comments/:root, it's fine
  if (!withoutRoot) {
    return [];
  }

  // Check if the remaining content starts with .design-system {
  // and there's nothing significant before or after the closing brace
  const designSystemPattern = /^\s*\.design-system\s*\{[\s\S]*\}\s*$/;
  if (designSystemPattern.test(withoutRoot)) {
    return [];
  }

  // Find what selectors are at the top level: track brace depth and whether
  // we are inside a .design-system block across lines.
  const unscopedSelectors = function* () {
    const state = {
      braceDepth: 0,
      currentSelector: "",
      inDesignSystem: false,
    };
    for (const line of withoutRoot.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Track if we're inside .design-system
      const inDesignSystem =
        state.inDesignSystem || trimmed.startsWith(".design-system");

      // Count braces
      const openBraces = (trimmed.match(/\{/g) || []).length;
      const closeBraces = (trimmed.match(/\}/g) || []).length;

      // If at top level and this looks like a selector, remember it:
      // .class, #id, element, [attr], :pseudo, *
      const atTopLevel = state.braceDepth === 0 && !inDesignSystem;
      const selectorMatch = trimmed.match(
        /^([.#]?[a-zA-Z_*][a-zA-Z0-9_-]*|\[[^\]]+\]|:[a-z-]+)/,
      );
      const currentSelector =
        atTopLevel && selectorMatch && !trimmed.startsWith("@")
          ? selectorMatch[1]
          : state.currentSelector;

      const braceDepth = state.braceDepth + openBraces - closeBraces;

      // If we just opened a brace and had a selector, it's unscoped
      const shouldRecord = currentSelector && openBraces > 0 && !inDesignSystem;

      if (shouldRecord) yield currentSelector;
      state.braceDepth = braceDepth;
      state.currentSelector = shouldRecord ? "" : currentSelector;
      // Reset inDesignSystem when we close back to depth 0
      state.inDesignSystem = braceDepth === 0 ? false : inDesignSystem;
    }
  };

  return [...unscopedSelectors()];
};

/**
 * Simplified check: does the file have .design-system wrapper?
 * @param {string} content - SCSS file content
 * @returns {boolean} - true if properly scoped
 */
const hasDesignSystemWrapper = (content) => {
  // Remove comments and @use/@forward/@import statements
  const withoutImports = stripCommentsAndImports(content);

  // Empty file after removing imports is fine
  if (!withoutImports) {
    return true;
  }

  // Remove :root blocks (allowed for CSS custom property defaults that themes
  // need to override at the same specificity level)
  const withoutRoot = withoutImports
    .replace(/:root\s*\{(?:[^#}]|#\{[^}]*\}|#(?!\{))*\}/g, "")
    .trim();

  // Empty after removing :root blocks is fine
  if (!withoutRoot) {
    return true;
  }

  // Check that the remaining content starts with .design-system {
  // and the file ends with the closing brace of a .design-system block.
  // The greedy [\s\S]* matches everything between the first { and last },
  // allowing multiple .design-system-prefixed blocks (e.g. body.design-system).
  return /^\s*\.design-system\s*\{[\s\S]*\}\s*$/.test(withoutRoot);
};

describe("design-system-scoping", () => {
  test("resumes unscoped selector detection after a scoped block closes", () => {
    const content = `.before { color: red; }
.design-system {
  .inside { color: green; }
}
.after
{
  .nested { color: blue; }
}`;
    expect(findUnscopedSelectors(content)).toEqual([".before", ".after"]);
  });

  test("extracts unscoped selectors correctly", () => {
    const unscopedContent = `
      @use "../variables" as *;

      .btn {
        color: red;
      }

      .hero {
        display: flex;
      }
    `;

    const selectors = findUnscopedSelectors(unscopedContent);
    expect(selectors).toContain(".btn");
    expect(selectors).toContain(".hero");
  });

  test("accepts properly scoped content", () => {
    const scopedContent = `
      @use "../variables" as *;

      .design-system {
        .btn {
          color: red;
        }

        .hero {
          display: flex;
        }
      }
    `;

    expect(hasDesignSystemWrapper(scopedContent)).toBe(true);
  });

  test("rejects unscoped content", () => {
    const unscopedContent = `
      @use "../variables" as *;

      .btn {
        color: red;
      }
    `;

    expect(hasDesignSystemWrapper(unscopedContent)).toBe(false);
  });

  test("extracts @forward names from index content", () => {
    const content = `
      // Comments and @use lines are not partial forwards
      @use "sass:math";
      @forward "base";
      @forward "./prose.scss" as prose-*;
      @forward "navigation" show nav;
      .design-system { color: red; }
    `;

    expect(forwardedNames(content)).toEqual(["base", "prose", "navigation"]);
  });

  test.each([
    '// @forward "table-of-contents";',
    '/*\n @forward "table-of-contents";\n */',
  ])("ignores commented-out forwards: %s", (comment) => {
    expect(forwardedNames(`${comment}\n@forward "base";`)).toEqual(["base"]);
  });

  test.each([
    ['"_table-of-contents"', "table-of-contents"],
    ["'_table-of-contents'", "table-of-contents"],
    ['"./_table-of-contents.scss"', "table-of-contents"],
    ["'./_table-of-contents.scss'", "table-of-contents"],
    ['"../components/_prose.print.scss"', "prose.print"],
  ])("normalizes quoted partial URL %s", (url, expected) => {
    expect(forwardedNames(`@forward ${url};`)).toEqual([expected]);
  });

  test.each([
    "as nav-*",
    "show nav, $gap",
    "hide nav, $gap",
    "as nav-* show nav-link, $nav-gap",
  ])("extracts forwards with a valid %s clause", (clause) => {
    expect(forwardedNames(`@forward "navigation" ${clause};`)).toEqual([
      "navigation",
    ]);
  });

  test("extracts multiline forwards in declaration order", () => {
    const content = `
      @forward
        "./_table-of-contents.scss"
        as toc-*
        show toc-link,
          $toc-gap
        ;
      @forward "base";
    `;

    expect(forwardedNames(content)).toEqual(["table-of-contents", "base"]);
  });

  test("ignores forward text inside CSS strings", () => {
    expect(
      forwardedNames(`
        .example { content: '@forward "table-of-contents";'; }
      `),
    ).toEqual([]);
  });

  test("rejects forwards without a quoted module URL", () => {
    expect(() => forwardedNames("@forward base;")).toThrow(
      "Expected a quoted module URL in @forward",
    );
  });

  test("every design-system partial is forwarded from _index.scss", () => {
    const forwarded = forwardedNames(
      readFileSync(join(rootDir, INDEX_FILE), "utf-8"),
    );
    const unforwarded = pipe(
      filter((file) => file !== INDEX_FILE),
      // Partial _<name>.scss must appear as an @forward "<name>" entry
      filter((file) => !forwarded.includes(basename(file).slice(1, -5))),
    )(DESIGN_SYSTEM_SCSS_FILES);

    console.log(
      `\n     Partials forwarded: ${forwarded.length} of ${
        DESIGN_SYSTEM_SCSS_FILES.length - 1
      }`,
    );

    if (unforwarded.length > 0) {
      console.log(
        "\n  ⚠️  Design-system partials not forwarded from _index.scss:",
      );
      for (const file of unforwarded) {
        console.log(`     - ${file}`);
      }
      console.log(
        "\n  💡 Add an @forward line for each partial to src/css/design-system/_index.scss",
      );
    }

    expect(unforwarded).toEqual([]);
  });

  test("all design-system SCSS files are properly scoped", () => {
    const violations = pipe(
      filter((file) => notMemberOf(ALLOWED_UNSCOPED_FILES)(basename(file))),
      flatMap((file) => {
        const content = readFileSync(join(rootDir, file), "utf-8");
        if (hasDesignSystemWrapper(content)) return [];
        return [{ file, selectors: findUnscopedSelectors(content) }];
      }),
    )(DESIGN_SYSTEM_SCSS_FILES);

    // Report findings
    console.log("\n  📊 Design System Scoping Analysis:");
    console.log(`     Files checked: ${DESIGN_SYSTEM_SCSS_FILES.length}`);
    console.log(`     Files skipped: ${ALLOWED_UNSCOPED_FILES.length}`);
    console.log(`     Violations found: ${violations.length}`);

    if (violations.length > 0) {
      console.log("\n  ⚠️  Files with unscoped styles:");
      for (const { file, selectors } of violations) {
        console.log(`     - ${file}`);
        if (selectors.length > 0) {
          console.log(`       Unscoped selectors: ${selectors.join(", ")}`);
        }
      }
      console.log(
        "\n  💡 All styles in design-system/ must be wrapped in .design-system { }",
      );
    }

    expect(violations).toEqual([]);
  });
});
