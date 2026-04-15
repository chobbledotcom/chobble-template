/**
 * Enforces that block template rendering matches the markdown/string field
 * types declared in `BLOCK_CMS_FIELDS` (and therefore in the generated
 * `.pages.yml`). A `.pages.yml` field declared as `rich-text` must be rendered
 * through the markdown pipeline in a `.prose`-classed element; a `string`
 * field must not.
 *
 * Three assertions per block:
 *   A. Every `| renderContent: "md"` call in a design-system template lives
 *      inside an element whose class list contains `prose`.
 *   B. Every `{{ block.<field> }}` / `{{ item.<field> }}` whose field is
 *      typed `markdown` in cmsFields is piped through `renderContent: "md"`.
 *   C. Every `{{ <var>.<field> | renderContent: "md" }}` targets a field that
 *      is typed `markdown` in the block's cmsFields (never `string`, etc.).
 */
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rootDir } from "#test/test-utils.js";
import { frozenSet } from "#toolkit/fp/set.js";
import { BLOCK_CMS_FIELDS, BLOCK_DOCS } from "#utils/block-schema.js";

/**
 * Allowlist for fields whose CMS type is `markdown` (→ `rich-text` in
 * `.pages.yml`) but which are intentionally rendered as raw HTML by the
 * template. Pages CMS's visual editor outputs HTML directly, so these fields
 * don't need `renderContent: "md"` and don't need a `.prose` wrapper.
 */
const RAW_HTML_FIELDS = frozenSet([
  // split-html figure: user types HTML in the visual editor; template drops
  // it into the figure column verbatim.
  "split-html:figure_html",
]);

/** HTML void elements don't get pushed onto the open-tag stack. */
const VOID_TAGS = frozenSet([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

const INCLUDES_ROOT = join(rootDir, "src/_includes");
const TAG_REGEX =
  /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>'"]|"[^"]*"|'[^']*')*)(\/?)>/g;
const OUTPUT_REGEX = /\{\{-?\s*([^}]+?)\s*-?\}\}/g;
const INCLUDE_REGEX = /\{%-?\s*include\s+"([^"]+)"[^%]*%\}/g;
const RENDER_MD_REGEX = /\|\s*renderContent:\s*"md"/;
const SIMPLE_PROP_REGEX = /^\w+\.\w+$/;
const CLASS_ATTR_REGEX = /\bclass\s*=\s*"([^"]*)"/;

/**
 * Read a Liquid template and recursively inline its `{%- include "path" -%}`
 * references, so tag-stack analysis sees the full rendered structure.
 * `seen` tracks visited paths as a plain array (cycles are rare; includes are
 * shallow) to avoid building a mutable Set accumulator.
 */
const readWithIncludes = (templatePath, seen) => {
  if (seen.includes(templatePath)) return "";
  const nextSeen = seen.concat([templatePath]);
  return readFileSync(templatePath, "utf-8").replace(
    INCLUDE_REGEX,
    (_, includePath) => {
      const fullPath = join(INCLUDES_ROOT, includePath);
      return existsSync(fullPath) ? readWithIncludes(fullPath, nextSeen) : "";
    },
  );
};

const isRawHtmlAllowlisted = (blockType, fieldName) =>
  fieldName != null && RAW_HTML_FIELDS.has(`${blockType}:${fieldName}`);

/**
 * Derive every per-block fact used by the rule checks. Inlined as an arrow
 * within `.map(...)` so all its locals (and the nested helpers that only this
 * mapping uses) remain scoped to a single call site.
 */
const blocksWithTemplates = Object.entries(BLOCK_CMS_FIELDS)
  .filter(([type]) => BLOCK_DOCS[type]?.template)
  .map(([type, fields]) => {
    const template = BLOCK_DOCS[type].template;

    const collectFieldEntries = (obj) =>
      Object.entries(obj).flatMap(([name, schema]) => [
        [name, schema.type],
        ...(schema.fields ? collectFieldEntries(schema.fields) : []),
      ]);

    const typeMap = Object.fromEntries(
      Object.entries(
        Object.groupBy(collectFieldEntries(fields), ([k]) => k),
      ).map(([name, entries]) => [name, entries.map(([, t]) => t)]),
    );

    const source = readWithIncludes(join(rootDir, template), []);

    // Stack of open HTML tags (with raw class attribute) at a given char
    // offset. Liquid tags are opaque — we ignore them. Fold TAG_REGEX matches
    // left-to-right with concat-based non-accumulating reduction.
    const tagStackAt = (pos) =>
      [...source.matchAll(TAG_REGEX)]
        .filter((m) => m.index < pos)
        .reduce((stack, m) => {
          const [, slash, rawName, attrs, selfClose] = m;
          const name = rawName.toLowerCase();
          if (slash === "/") {
            const idx = stack.findLastIndex((t) => t.name === name);
            return idx === -1 ? stack : stack.slice(0, idx);
          }
          if (selfClose === "/" || VOID_TAGS.has(name)) return stack;
          const classMatch = attrs.match(CLASS_ATTR_REGEX);
          return stack.concat([
            { name, classes: classMatch ? classMatch[1] : "" },
          ]);
        }, []);

    const outputs = [...source.matchAll(OUTPUT_REGEX)].map((m) => {
      const body = m[1];
      const pipeIndex = body.indexOf("|");
      const head = (pipeIndex === -1 ? body : body.slice(0, pipeIndex)).trim();
      const pipeline = pipeIndex === -1 ? "" : body.slice(pipeIndex);
      const parent = tagStackAt(m.index).at(-1);
      return {
        fieldName: SIMPLE_PROP_REGEX.test(head) ? head.split(".").pop() : null,
        isMarkdownRender: RENDER_MD_REGEX.test(pipeline),
        wrappedInProse: parent?.classes.split(/\s+/).includes("prose") ?? false,
        line: source.slice(0, m.index).split("\n").length,
      };
    });

    return { type, template, typeMap, outputs };
  });

/**
 * Run `check(context, output)` for every (block, output) pair and collect the
 * violation strings it emits. `check` returns a message string for a
 * violation or null to skip.
 */
const collectViolations = (check) =>
  blocksWithTemplates.flatMap(({ type, template, typeMap, outputs }) =>
    outputs.flatMap((output) => {
      const message = check({ type, typeMap, output });
      return message
        ? [`${type} (${template}:${output.line}): ${message}`]
        : [];
    }),
  );

describe("block-markdown-rendering", () => {
  test(`every | renderContent: "md" is inside a .prose-classed element`, () => {
    const violations = collectViolations(({ type, output }) => {
      if (!output.isMarkdownRender) return null;
      if (isRawHtmlAllowlisted(type, output.fieldName)) return null;
      if (output.wrappedInProse) return null;
      return `\`renderContent: "md"\` is not wrapped in a .prose element`;
    });
    expect(violations).toEqual([]);
  });

  test(`markdown-typed fields are rendered through renderContent: "md"`, () => {
    const violations = collectViolations(({ type, typeMap, output }) => {
      if (output.fieldName == null) return null;
      if (isRawHtmlAllowlisted(type, output.fieldName)) return null;
      if (!typeMap[output.fieldName]?.includes("markdown")) return null;
      if (output.isMarkdownRender) return null;
      return `field "${output.fieldName}" is typed markdown in cmsFields but rendered plain — pipe it through \`| renderContent: "md"\``;
    });
    expect(violations).toEqual([]);
  });

  test(`renderContent: "md" only targets markdown-typed fields`, () => {
    const violations = collectViolations(({ type, typeMap, output }) => {
      if (!output.isMarkdownRender || output.fieldName == null) return null;
      if (isRawHtmlAllowlisted(type, output.fieldName)) return null;
      const types = typeMap[output.fieldName];
      if (!types || types.includes("markdown")) return null;
      return `field "${output.fieldName}" is rendered as markdown but cmsFields declares it as ${types.join(", ")} — update the schema to \`md()\` or drop \`| renderContent: "md"\``;
    });
    expect(violations).toEqual([]);
  });
});
