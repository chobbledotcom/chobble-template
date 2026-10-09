import { mkdirSync, symlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  assertDocumentationLinks,
  createFrontmatter,
  createTempFile,
  extractDocumentationExamples,
  withTempDir,
} from "#test/test-utils.js";
import { collectBlockErrors } from "#utils/block-schema.js";

const checkDocumentationFixture = (files, documents = ["README.md"]) =>
  withTempDir("documentation-links", (dir) => {
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, file)), { recursive: true });
      createTempFile(dir, file, content);
    }
    assertDocumentationLinks(dir, documents);
  });

describe("documentation link checker", () => {
  test.each([
    ...[
      ["punctuation", "# What's `new`? A & B!", "#whats-new-a--b"],
      [
        "Unicode and encoded fragments",
        "# Caf\u00e9 \u4e2d\u6587",
        "#caf%C3%A9-%E4%B8%AD%E6%96%87",
      ],
      ["combining marks", "# Cafe\u0301", "#cafe%CC%81"],
      ["duplicate headings", "# Same\n## Same\n### Same", "#same-2"],
      ["colliding suffixed headings", "# Same\n# Same-1\n# Same", "#same-2"],
      ["underscores and hyphens", "# an_id -- here", "#an_id----here"],
      ["explicit HTML anchors", '<a id="custom"></a>', "#custom"],
    ].map(([name, heading, anchor]) => ({
      name: `accepts GitHub anchors for ${name}`,
      files: {
        "target.md": heading,
        "README.md": `[target](target.md${anchor})`,
      },
    })),
    ...["L1", "L2-L3"].map((anchor) => ({
      name: `accepts source line anchor ${anchor}`,
      files: {
        "source.js": "one\ntwo\nthree\n",
        "README.md": `[source](source.js#${anchor})`,
      },
    })),
    {
      name: "resolves same-document and reference-style links outside code fences",
      files: {
        "README.md":
          "# Heading\n[here][ref]\n\n[ref]: #heading\n\n```md\n[example](missing.md)\n```",
      },
    },
    {
      name: "resolves a query-only link against the current document",
      files: { "README.md": "# Heading\n[here](?plain=1#heading)" },
    },
    {
      name: "ignores external schemes and protocol-relative URLs",
      files: {
        "README.md": [
          "https://example.test/missing#anchor",
          "mailto:author@example.test",
          "//example.test/missing",
          "git+ssh://example.test/repo",
        ]
          .map((href) => `[external](${href})`)
          .join("\n"),
      },
    },
    {
      name: "accepts encoded paths, query strings, directory links, and directory README anchors",
      files: {
        "folder/README.md": "# Folder",
        "space name.md": "# Space",
        "README.md":
          "[directory](folder/)\n[heading](folder/#folder)\n[file](space%20name.md?plain=1#space)",
      },
    },
    {
      name: "frontmatter does not create prose links or heading anchors",
      files: {
        "README.md": createFrontmatter(
          { description: "[not prose](missing.md)" },
          "# Prose\n[here](#prose)",
        ),
      },
    },
    {
      name: "published content is excluded from checkout URL analysis",
      files: { "src/pages/example.md": "[site route](/contact/)" },
      documents: ["src/pages/example.md"],
    },
  ])("$name", ({ files, documents }) => {
    expect(() => checkDocumentationFixture(files, documents)).not.toThrow();
  });

  test.each([
    ["missing.md", "missing target"],
    ["target.md#missing", "missing anchor"],
    ["target.md#heading-1", "missing anchor"],
    ["source.js#L3-L2", "invalid source line range"],
    ["source.js#L1-L4", "invalid source line range"],
    ["source.js#L0", "missing anchor"],
    ["../outside.md", "target escapes"],
    ["%2e%2e/outside.md", "target escapes"],
  ])("rejects %s with the originating link in the error", (href, error) => {
    expect(() =>
      checkDocumentationFixture({
        "target.md": "# Heading",
        "source.js": "one\ntwo\nthree\n",
        "README.md": `[broken](${href})`,
      }),
    ).toThrow(`README.md: ${href}: ${error}`);
  });

  test.each([
    false,
    true,
  ])("rejects escaping symlinks (directory: %s)", (directory) => {
    withTempDir("documentation-symlink", (dir) => {
      mkdirSync(join(dir, "root"));
      mkdirSync(join(dir, "root-sibling"));
      createTempFile(dir, "root-sibling/outside.md", "# Outside");
      symlinkSync(
        join(dir, directory ? "root-sibling" : "root-sibling/outside.md"),
        join(dir, "root/link"),
      );
      const href = directory ? "link/outside.md" : "link";
      createTempFile(dir, "root/README.md", `[escape](${href})`);
      expect(() =>
        assertDocumentationLinks(join(dir, "root"), ["README.md"]),
      ).toThrow("symlink escapes documentation root");
    });
  });

  test("allows symlinks whose targets stay inside the root", () => {
    withTempDir("documentation-internal-symlink", (dir) => {
      createTempFile(dir, "target.md", "# Target");
      symlinkSync(join(dir, "target.md"), join(dir, "alias.md"));
      createTempFile(dir, "README.md", "[target](alias.md#target)");
      expect(() => assertDocumentationLinks(dir, ["README.md"])).not.toThrow();
    });
  });
});

describe("authored YAML extraction", () => {
  test.each(["yaml", "yml"])("extracts a %s blocks envelope", (language) => {
    const examples = extractDocumentationExamples(
      "guide.md",
      `\`\`\`${language}\nblocks:\n  - type: markdown\n    content: Hello\n\`\`\``,
    );
    expect(examples).toEqual([
      {
        location: "guide.md:1",
        blocks: [{ type: "markdown", content: "Hello" }],
      },
    ]);
    expect(collectBlockErrors(examples[0].blocks)).toEqual([]);
  });

  test("extracts explicitly designated bare arrays", () => {
    expect(
      extractDocumentationExamples(
        "guide.md",
        "```yaml blocks\n- type: markdown\n  content: Hello\n```",
      ),
    ).toEqual([
      {
        location: "guide.md:1",
        blocks: [{ type: "markdown", content: "Hello" }],
      },
    ]);
  });

  test.each([
    "blocks: null",
    "blocks: {}",
    "blocks: text",
    "type: markdown",
    "null",
  ])("rejects malformed designated blocks: %s", (code) => {
    expect(() =>
      extractDocumentationExamples(
        "guide.md",
        `\`\`\`yaml blocks\n${code}\n\`\`\``,
      ),
    ).toThrow("guide.md:1: blocks must be an array");
  });

  test("rejects invalid YAML with its document location", () => {
    expect(() =>
      extractDocumentationExamples("guide.md", "```yaml\nblocks: [\n```"),
    ).toThrow("Invalid YAML in guide.md:1");
  });

  test("rejects empty explicitly designated examples", () => {
    expect(() =>
      extractDocumentationExamples("guide.md", "```yaml blocks\n```"),
    ).toThrow("guide.md:1: blocks must be an array");
  });

  test("does not mistake an explicit trailing null for a frontmatter delimiter", () => {
    expect(() =>
      extractDocumentationExamples(
        "guide.md",
        "```yaml blocks\nblocks: []\n---\nnull\n```",
      ),
    ).toThrow("guide.md:1: blocks must be an array");
  });

  test("rejects a malformed blocks envelope without a fence marker", () => {
    expect(() =>
      extractDocumentationExamples("guide.md", "```yaml\nblocks: {}\n```"),
    ).toThrow("guide.md:1: blocks must be an array");
  });

  test("reports fence locations including the source frontmatter", () => {
    const source = "---\nname: Guide\n---\n\n```yaml\nblocks: []\n```";
    expect(extractDocumentationExamples("guide.md", source)).toEqual([
      { location: "guide.md:5", blocks: [] },
    ]);
  });

  test.each([
    "- typo: markdown",
    "- type: invented",
    "- type: markdown",
  ])("does not filter invalid designated entries: %s", (code) => {
    const examples = extractDocumentationExamples(
      "guide.md",
      `\`\`\`yaml blocks\n${code}\n\`\`\``,
    );
    expect(examples).toHaveLength(1);
    expect(collectBlockErrors(examples[0].blocks).length).toBeGreaterThan(0);
  });

  test("ignores unrelated YAML without guessing from a valid type", () => {
    expect(
      extractDocumentationExamples(
        "guide.md",
        "```yaml\n- type: markdown\n```\n```yaml\n- run: npm run build\n```",
      ),
    ).toEqual([]);
  });

  test.each([
    "yaml",
    "yaml blocks",
  ])("accepts %s frontmatter examples with a closing empty YAML document", (info) => {
    expect(
      extractDocumentationExamples(
        "guide.md",
        `\`\`\`${info}\n---\nblocks: []\n---\n\`\`\``,
      ),
    ).toEqual([{ location: "guide.md:1", blocks: [] }]);
  });

  test.each([
    { type: "code-block", language: "yaml", code: "blocks: []" },
    { type: "split-code", figure_language: "yml", figure_code: "blocks: []" },
  ])("extracts published $type examples using the same envelope convention", (block) => {
    expect(
      extractDocumentationExamples(
        "src/pages/guide.md",
        createFrontmatter({ blocks: [block] }),
      ),
    ).toEqual([{ location: "src/pages/guide.md block 1", blocks: [] }]);
  });

  test("rejects malformed published block mappings", () => {
    const source = createFrontmatter({
      blocks: [{ type: "code-block", language: "yaml", code: "blocks: {}" }],
    });
    expect(() =>
      extractDocumentationExamples("src/pages/guide.md", source),
    ).toThrow("src/pages/guide.md block 1: blocks must be an array");
  });

  test("excludes generated canonical examples from authored validation", () => {
    expect(
      extractDocumentationExamples(
        "skills/cfa-static-site-builder/references/blocks.md",
        "```yaml\nblocks: invalid\n```",
      ),
    ).toEqual([]);
  });
});
