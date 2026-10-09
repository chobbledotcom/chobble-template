import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import MarkdownIt from "markdown-it";
import { describe, expect, test } from "vitest";
import YAML from "yaml";
import { blocksFieldFor } from "#scripts/customise-cms/blocks.js";
import { COLLECTIONS } from "#scripts/customise-cms/collections.js";
import {
  renderBlocksReference,
  renderFieldTable,
} from "#scripts/lib/render-blocks-reference.js";
import { getTableRows, rootDir } from "#test/test-utils.js";
import { collectBlockReferences } from "#test/unit/utils/pages-yml-helpers.js";
import { assertColumnSafeTypes } from "#utils/block-columns.js";
import { buildGalleryBlocks } from "#utils/block-gallery.js";
import { CONTAINER_FIELDS } from "#utils/block-schema/shared.js";
import {
  BLOCK_DOCS,
  BLOCK_EXAMPLES,
  BLOCK_SCHEMAS,
  getBlockContainerWidth,
  getBlockTemplate,
} from "#utils/block-schema.js";

const markdown = new MarkdownIt({ html: true });
const parseMarkdown = (source) =>
  new DOMParser().parseFromString(markdown.render(source), "text/html");
const tableRows = (source) => getTableRows(parseMarkdown(source));

describe("block reference", () => {
  test("rejects missing or reordered canonical example types", () => {
    expect(() => renderBlocksReference(BLOCK_EXAMPLES.slice(1))).toThrow(
      "identical registry order",
    );
    expect(() => renderBlocksReference(BLOCK_EXAMPLES.toReversed())).toThrow(
      "identical registry order",
    );
  });

  test("rejects an entry with no canonical example", () => {
    const [first, ...rest] = BLOCK_EXAMPLES;
    expect(() =>
      renderBlocksReference([{ ...first, example: undefined }, ...rest]),
    ).toThrow(`Missing documentation or canonical example for ${first.type}`);
  });

  test("YAML examples containing Markdown fences remain a single complete code block", () => {
    const entry = BLOCK_EXAMPLES.find(({ type }) => type === "markdown");
    const example = {
      ...entry.example,
      content: "```yaml\nblocks: []\n```\n````",
    };
    const tokens = markdown.parse(
      renderBlocksReference(
        BLOCK_EXAMPLES.map((block) =>
          block === entry ? { ...block, example } : block,
        ),
      ),
      {},
    );
    const fences = tokens.filter((token) => token.type === "fence");
    expect(fences).toHaveLength(BLOCK_EXAMPLES.length);
    expect(YAML.parse(fences[BLOCK_EXAMPLES.indexOf(entry)].content)).toEqual({
      blocks: [example],
    });
  });

  test.each([
    [
      { type: "html", content: "Valid HTML" },
      'Canonical example type must match registry type "markdown"',
    ],
    [
      { content: "Missing type" },
      'Canonical example type must match registry type "markdown"',
    ],
    [{ type: "markdown" }, 'missing required "content"'],
    [{ type: "markdown", content: 17 }, 'field "content" must be a string'],
    [
      { type: "markdown", content: "Valid", unknown: true },
      'unknown keys: "unknown"',
    ],
  ])("rejects invalid canonical Markdown examples: %j", (example, message) => {
    const entries = BLOCK_EXAMPLES.map((entry) =>
      entry.type === "markdown" ? { ...entry, example } : entry,
    );
    expect(() => renderBlocksReference(entries)).toThrow(message);
  });

  test("documents every registered type once in deliberate registry order", () => {
    const headings = [
      ...parseMarkdown(renderBlocksReference()).querySelectorAll("h2 > code"),
    ].map((node) => node.textContent);
    expect(headings.length).toBeGreaterThan(0);
    expect(headings).toEqual(Object.keys(BLOCK_SCHEMAS));
  });

  test("rendered canonical YAML matches gallery serialization without changing examples", () => {
    const sources = markdown
      .parse(renderBlocksReference(), {})
      .filter((token) => token.type === "fence" && token.info === "yaml")
      .map((token) => token.content.trimEnd());
    const gallerySources = buildGalleryBlocks()
      .filter(
        (block) => block.type === "code-block" && block.language === "yaml",
      )
      .map((block) => block.code);
    expect(sources).toEqual(gallerySources);
    const examples = sources.flatMap((source) => YAML.parse(source).blocks);
    expect(examples).toEqual(BLOCK_EXAMPLES.map(({ example }) => example));
  });

  test("common wrapper fields are generated from their shared schema", () => {
    const common = parseMarkdown(renderBlocksReference()).querySelector(
      "table",
    );
    expect(
      [...common.querySelectorAll("tbody tr td:first-child")].map(
        (cell) => cell.textContent,
      ),
    ).toEqual(Object.keys(CONTAINER_FIELDS));
    expect(tableRows(renderFieldTable(CONTAINER_FIELDS))).toEqual([
      ["dark", "boolean", "optional", "false", "Dark", ""],
      ["compact", "boolean", "optional", "None", "Compact", ""],
    ]);
  });

  test("column compatibility covers only registered types and agrees with runtime placement checks", () => {
    const rows = tableRows(renderBlocksReference()).filter(
      (row) => row.length === 3,
    );
    expect(rows.map(([type]) => type)).toEqual(Object.keys(BLOCK_SCHEMAS));
    for (const [type, width, compatibility] of rows) {
      expect(width, type).toBe(getBlockContainerWidth(type));
      const check = () => assertColumnSafeTypes([type], "documentation test");
      if (compatibility === "No")
        expect(check, type).toThrow(`Block type "${type}"`);
      else {
        expect(compatibility, type).toBe("Yes");
        expect(check, type).not.toThrow();
      }
    }
  });

  test("CMS-reachable blocks have documented components and editor availability", () => {
    const cms = YAML.parse(readFileSync(join(rootDir, ".pages.yml"), "utf8"));
    const references = collectBlockReferences(cms);
    expect(references.length).toBeGreaterThan(0);
    const rendered = parseMarkdown(renderBlocksReference());
    const code = [...rendered.querySelectorAll("code")].map(
      (node) => node.textContent,
    );
    for (const { name, component } of references) {
      expect(code, name).toContain(component);
      expect(BLOCK_DOCS[name]?.summary, name).toBeTruthy();
    }
    expect(rendered.body.textContent).toContain(
      "editor allowlist, not a runtime restriction",
    );
    // Renders the entire reference document and parses it as Markdown,
    // which can exceed the 1500ms default when lanes run in parallel.
  }, 5000);

  test.each(
    COLLECTIONS,
  )("documented availability exactly matches the $name block editor", ({
    name,
  }) => {
    const rendered = parseMarkdown(renderBlocksReference());
    const types = [...rendered.querySelectorAll("h2 > code")].map(
      (node) => node.textContent,
    );
    const availability = [...rendered.querySelectorAll("p")]
      .filter((node) =>
        node.textContent.startsWith("CMS collection availability:"),
      )
      .map((node) =>
        node.textContent.slice("CMS collection availability: ".length),
      );
    expect(availability).toHaveLength(types.length);
    const documented = types.filter(
      (type, index) =>
        availability[index] === "All collections with a block editor" ||
        availability[index].split(", ").includes(name),
    );
    expect(documented.toSorted()).toEqual(
      blocksFieldFor(name)
        .blocks.map((block) => block.name)
        .toSorted(),
    );
  });

  test("all schema and resolved template paths are documented and exist", () => {
    const code = [
      ...parseMarkdown(renderBlocksReference()).querySelectorAll("code"),
    ].map((node) => node.textContent);
    for (const type of Object.keys(BLOCK_SCHEMAS)) {
      expect(code, type).toContain(`src/_lib/utils/block-schema/${type}.js`);
      expect(code, type).toContain(`src/_includes/${getBlockTemplate(type)}`);
      if (BLOCK_DOCS[type].scss)
        expect(code, type).toContain(BLOCK_DOCS[type].scss);
    }
    const paths = code.filter(
      (text) => text.startsWith("src/") && !text.includes("\n"),
    );
    expect(paths.length).toBeGreaterThan(Object.keys(BLOCK_SCHEMAS).length);
    for (const path of paths)
      expect(statSync(join(rootDir, path)).isFile(), path).toBe(true);
  });
});

describe("full field schema rendering", () => {
  test("recurses through optional objects and nested lists while preserving required children", () => {
    const fields = {
      panel: {
        type: "object",
        fields: {
          groups: {
            type: "object",
            list: true,
            fields: {
              button: {
                type: "object",
                fields: { text: { type: "string", required: true } },
              },
            },
          },
        },
      },
    };
    expect(
      tableRows(renderFieldTable(fields)).map((row) => row.slice(0, 3)),
    ).toEqual([
      ["panel", "object", "optional"],
      ["panel.groups", "array<object>", "optional"],
      ["panel.groups[].button", "object", "optional"],
      ["panel.groups[].button.text", "string", "required"],
    ]);
  });

  test.each([
    [false, "false"],
    [0, "0"],
    ["", '""'],
    [undefined, "None"],
    ["center", '"center"'],
    [({ reverse }) => (reverse ? "right" : "left"), "Derived"],
  ])("preserves default %j independently independently from required presence", (value, displayed) => {
    const rows = tableRows(
      renderFieldTable({
        setting: { type: "string", required: true, default: value },
      }),
    );
    expect(rows[0].slice(2, 4)).toEqual(["required", displayed]);
  });

  test("escapes pipes, backticks, HTML, links, and newlines without corrupting table cells", () => {
    const label = "Label | <img> & [link](https://example.test)";
    const description = "`code` | <script>alert(1)</script>\n**not emphasis**";
    const source = renderFieldTable({
      "a|`b": {
        type: "string",
        label,
        description,
        default: "`x`|<b>",
      },
    });
    const rendered = parseMarkdown(source);
    expect(rendered.querySelectorAll("tbody tr")).toHaveLength(1);
    const cells = [...rendered.querySelectorAll("tbody td")];
    expect(cells).toHaveLength(6);
    expect(cells.map((node) => node.textContent)).toEqual([
      "a|`b",
      "string",
      "optional",
      '"`x`|<b>"',
      label,
      "`code` | <script>alert(1)</script>**not emphasis**",
    ]);
    expect(rendered.querySelectorAll("img, script, a, strong, b")).toHaveLength(
      0,
    );
    expect(cells[5].querySelectorAll("br")).toHaveLength(1);
  });

  test("documents actual nested fields omitted from the old flattened reference", () => {
    const rows = tableRows(renderBlocksReference());
    expect(rows).toContainEqual([
      "items[].icon_label",
      "string",
      "optional",
      "None",
      "Icon Accessible Label",
      "",
    ]);
    expect(rows).toContainEqual([
      "buttons[].text",
      "string",
      "required",
      "None",
      "Button Text",
      "",
    ]);
    expect(rows).toContainEqual([
      "buttons[].href",
      "string",
      "required",
      "None",
      "URL",
      "",
    ]);
    expect(rows).toContainEqual([
      "items[].description",
      "markdown",
      "optional",
      "None",
      "Description",
      "",
    ]);
    expect(
      rows.some(
        ([path, type]) => path === "filter.property" && type === "string",
      ),
    ).toBe(true);
    expect(
      rows.some(([path, type]) => path === "items" && type === "array<string>"),
    ).toBe(true);
  });

  test("retains reference collection options and pipe-delimited list alternatives", () => {
    const referenceRows = tableRows(renderFieldTable(BLOCK_SCHEMAS.snippet));
    expect(referenceRows[0][1]).toBe("reference");
    expect(referenceRows[0][5]).toContain(
      'CMS options: {"collection":"snippets"}',
    );
    const statsRows = tableRows(renderFieldTable(BLOCK_SCHEMAS.stats));
    expect(statsRows[0][5]).toContain('Also accepts "value|label" strings.');
    expect(statsRows.find(([path]) => path === "items[].value")[2]).toBe(
      "required",
    );
  });
});
