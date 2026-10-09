import { describe, expect, test } from "vitest";
import {
  assertDocumentationLinks,
  getDocumentationFiles,
  rootDir,
} from "#test/test-utils.js";

describe("author documentation", () => {
  test("inventory includes the canonical engineering guides and skill references", () => {
    expect(getDocumentationFiles()).toEqual(
      expect.arrayContaining([
        "CLAUDE.md",
        "README.md",
        "BLOCKS_LAYOUT.md",
        "ARCHITECTURE.md",
        ".claude/agents/code-nitpicker.md",
        "src/_lib/README.md",
        "src/snippets/README.md",
        "test/TEST-QUALITY-CRITERIA.md",
        "docs/developer-reference.md",
        "skills/cfa-static-site-builder/SKILL.md",
        "skills/cfa-static-site-builder/references/blocks.md",
        "skills/cfa-static-site-builder/references/layouts.md",
      ]),
    );
  });

  test("inventory excludes legal notices and evaluation fixtures", () => {
    expect(
      getDocumentationFiles().filter(
        (file) => file.includes("/evals/") || file.includes("LICENSE"),
      ),
    ).toEqual([]);
  });

  test("checkout links resolve within the repository with valid anchors", () => {
    expect(() =>
      assertDocumentationLinks(rootDir, getDocumentationFiles()),
    ).not.toThrow();
    // Validates every link in the documentation inventory; instrumented runs
    // exceed the default timeout
  }, 5000);
});
