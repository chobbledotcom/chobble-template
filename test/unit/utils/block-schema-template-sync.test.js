import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rootDir } from "#test/test-utils.js";
import { BLOCK_DOCS, BLOCK_SCHEMAS } from "#utils/block-schema.js";

// Keys the outer wrapper in blocks.html injects onto every block, plus `type`
// which is always present as the discriminant.
const ALWAYS_ALLOWED_KEYS = ["dark", "type"];

const INCLUDES_DIR = join(rootDir, "src/_includes");
const INCLUDE_PATTERN = /\{%-?\s*include\s+"([^"]+)"([\s\S]*?)-?%\}/g;
const BLOCK_REF_PATTERN = /\bblock\.([a-zA-Z_][a-zA-Z0-9_]*)/g;

/** An include inherits the caller's `block` variable only when it either
 *  passes no arguments or explicitly threads `block: block`. Includes that
 *  rebind variables (e.g. `intro: block.header_intro`) hand the partial a
 *  local-scoped context, so any `block.X` refs inside the partial belong to
 *  the partial's own schema, not the caller's. */
const includeInheritsBlock = (argsText) => {
  const trimmed = argsText.trim();
  if (trimmed === "") return true;
  return /\bblock\s*:\s*block\b/.test(trimmed);
};

const COMMENT_BLOCK =
  /\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g;
const INCLUDE_PATH = /(\{%-?\s*include\s+)"[^"]+"/g;

/** Strip comments (usage examples reference fields unrelated to the block,
 *  e.g. `block.figure_items` in an "embed me like this" snippet) and include
 *  path strings (`"render-items-block.html"` would otherwise regex-match as
 *  `block.html`). Args passed to an include, like `horizontal: block.horizontal`,
 *  are preserved so we still see them as references. */
const stripNonCode = (source) =>
  source.replace(COMMENT_BLOCK, "").replace(INCLUDE_PATH, "$1");

/** Recursively read a template and every static include that still shares the
 *  caller's block scope. Returns the concatenated source (with comments and
 *  string literals stripped) so callers can regex over the lot. */
const readWithIncludes = (absPath, visited = new Set()) => {
  if (visited.has(absPath) || !existsSync(absPath)) return "";
  visited.add(absPath);
  const rawContent = readFileSync(absPath, "utf-8");
  const childSources = [...rawContent.matchAll(INCLUDE_PATTERN)]
    .filter((m) => includeInheritsBlock(m[2]))
    .map((m) => readWithIncludes(join(INCLUDES_DIR, m[1]), visited));
  return [stripNonCode(rawContent), ...childSources].join("\n");
};

const collectBlockRefs = (templatePath) => {
  const combined = readWithIncludes(join(rootDir, templatePath));
  return new Set([...combined.matchAll(BLOCK_REF_PATTERN)].map((m) => m[1]));
};

/** Multiple block types (e.g. all split-* variants) can share one template.
 *  Group them so the allowed-keys set is the union across the group. */
const groupBlockTypesByTemplate = () =>
  Object.entries(
    Object.groupBy(
      Object.entries(BLOCK_DOCS).filter(([, docs]) => docs.template),
      ([, docs]) => docs.template,
    ),
  ).map(([template, entries]) => [template, entries.map(([type]) => type)]);

const unionSchemaFields = (blockTypes) =>
  new Set(blockTypes.flatMap((type) => Object.keys(BLOCK_SCHEMAS[type])));

describe("template ↔ block schema sync", () => {
  for (const [templatePath, blockTypes] of groupBlockTypesByTemplate()) {
    const label = blockTypes.join(", ");
    const refs = collectBlockRefs(templatePath);
    const schemaFields = unionSchemaFields(blockTypes);

    test(`${templatePath}: every block.<field> in the template is declared in the schema (${label})`, () => {
      const undeclared = [...refs]
        .filter((k) => !schemaFields.has(k) && !ALWAYS_ALLOWED_KEYS.includes(k))
        .sort();
      expect(undeclared).toEqual([]);
    });

    test(`${templatePath}: every schema field is used somewhere in the template (${label})`, () => {
      const unused = [...schemaFields].filter((f) => !refs.has(f)).sort();
      expect(unused).toEqual([]);
    });
  }
});
