/**
 * The docs-references collection publishes the repository's reference
 * documents as guide pages. The builder takes its root directory, so these
 * tests run against fixture sources: every manifest entry must yield an
 * item whose blocks are schema-valid and whose markdown is
 * publish-transformed, and a missing source fails rather than quietly
 * dropping a document.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";
import { withTempDir } from "#test/test-utils.js";
import { collectBlockErrors } from "#utils/block-schema.js";
import { buildDocsReferences } from "#utils/docs-references.js";

const SOURCES = [
  "ARCHITECTURE.md",
  "skills/cfa-static-site-builder/references/project-setup.md",
  "skills/cfa-static-site-builder/references/content-authoring.md",
  "skills/cfa-static-site-builder/references/blocks.md",
  "skills/cfa-static-site-builder/references/layouts.md",
  "skills/cfa-static-site-builder/references/i18n.md",
  "skills/cfa-static-site-builder/references/site-mirroring.md",
  "skills/cfa-static-site-builder/references/verification.md",
];

const writeFixture = (root, relative, body) => {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `# Title\n\n## Section\n\n${body}\n`);
};

const fixtureRoot = (root) => {
  for (const source of SOURCES) writeFixture(root, source, "Fixture body.");
  return root;
};

describe("buildDocsReferences", () => {
  test("builds one publishable item per manifest entry", () => {
    withTempDir("docs-references-items", (root) => {
      const items = buildDocsReferences(fixtureRoot(root));

      expect(items.map((item) => item.slug)).toEqual([
        "architecture",
        "project-setup",
        "content-authoring",
        "blocks",
        "layouts",
        "i18n",
        "site-mirroring",
        "verification",
      ]);
      for (const item of items) {
        expect(item.category).toBe("reference");
        expect(item.name).toBeTruthy();
        expect(item.subtitle).toBeTruthy();
        expect(item.blocks.map((block) => block.type)).toEqual([
          "guide-header",
          "guide-navigation",
          "table-of-contents",
          "markdown",
        ]);
        expect(
          collectBlockErrors(item.blocks, ` fixture ${item.slug}`),
        ).toEqual([]);
      }
    });
  });

  test("publishes transformed markdown, not the source", () => {
    withTempDir("docs-references-transform", (root) => {
      fixtureRoot(root);
      writeFixture(
        root,
        "ARCHITECTURE.md",
        "Read [project setup](skills/cfa-static-site-builder/references/project-setup.md).",
      );

      const [architecture] = buildDocsReferences(root);
      const markdown = architecture.blocks.at(-1).content;

      expect(markdown).not.toContain("# Title");
      expect(markdown).toContain(
        "[project setup](/guide/reference/project-setup/)",
      );
    });
  });

  test("fails when a manifest source is missing", () => {
    withTempDir("docs-references-missing", (root) => {
      for (const source of SOURCES.slice(1))
        writeFixture(root, source, "Body.");

      expect(() => buildDocsReferences(root)).toThrow("ENOENT");
    });
  });
});
