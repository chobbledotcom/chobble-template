/**
 * Generate the "Block Types" section of BLOCKS_LAYOUT.md from BLOCK_DOCS
 * in src/_lib/utils/block-schema.js.
 *
 * The script replaces everything between <!-- BEGIN GENERATED BLOCKS -->
 * and <!-- END GENERATED BLOCKS --> markers in BLOCKS_LAYOUT.md.
 *
 * Run: bun scripts/generate-blocks-reference.js
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { COLUMN_DISALLOWED_TYPES } from "#utils/block-columns.js";
import { BLOCK_DOCS, BLOCK_SCHEMAS } from "#utils/block-schema.js";

const BLOCKS_LAYOUT_PATH = join(ROOT_DIR, "BLOCKS_LAYOUT.md");

const renderParamTable = (params) => {
  const entries = Object.entries(params);
  if (entries.length === 0) return "";

  const lines = [
    "| Parameter | Type | Default | Description |",
    "|---|---|---|---|",
  ];

  for (const [key, doc] of entries) {
    const req = doc.required ? "**required**" : "\u2014";
    const def = doc.default ? `\`${doc.default}\`` : req;
    lines.push(`| \`${key}\` | ${doc.type} | ${def} | ${doc.description} |`);
  }

  return `${lines.join("\n")}\n`;
};

const renderMetaLines = (doc, type) => {
  const lines = [];
  const component = `block_${type.replaceAll("-", "_")}`;
  lines.push(`**Component:** \`${component}\``);
  if (doc.template) lines.push(`**Template:** \`${doc.template}\``);
  if (doc.scss) lines.push(`**SCSS:** \`${doc.scss}\``);
  if (doc.htmlRoot) lines.push(`**HTML root:** \`${doc.htmlRoot}\``);
  lines.push("");
  return lines;
};

const renderBlock = (type) => {
  const doc = BLOCK_DOCS[type];
  if (!doc) {
    throw new Error(`No BLOCK_DOCS entry for block type "${type}"`);
  }

  const lines = [`### \`${type}\`\n`, `${doc.summary}\n`];
  lines.push(...renderMetaLines(doc, type));

  const table = renderParamTable(doc.params);
  if (table) lines.push(table);
  if (doc.notes) lines.push(`${doc.notes}\n`);

  lines.push("---\n");
  return lines.join("\n");
};

const generateBlocksSection = () => {
  const types = Object.keys(BLOCK_SCHEMAS);
  const sections = types.map(renderBlock);

  const missingDocs = types.filter((t) => !BLOCK_DOCS[t]);
  if (missingDocs.length > 0) {
    throw new Error(
      `Block types missing from BLOCK_DOCS: ${missingDocs.join(", ")}`,
    );
  }

  return `## Block Types\n\n${sections.join("\n")}`;
};

const generateMultiColumnSection = () => {
  const splitTypes = Object.keys(BLOCK_SCHEMAS)
    .filter((t) => t.startsWith("split-"))
    .sort();
  const namedDisallowed = [...COLUMN_DISALLOWED_TYPES].sort();
  const disallowedList = [...namedDisallowed, ...splitTypes]
    .map((t) => `- \`${t}\``)
    .join("\n");

  return `## Multi-Column Layouts

Any collection can render the first section of its blocks as responsive columns by adding an entry to \`src/_data/blockLayouts.json\`, keyed by a tag that appears on the page (e.g. \`products\`, \`properties\`).

\`\`\`json
{
  "products": {
    "columns": [
      { "types": ["gallery"] },
      { "types": ["markdown", "buy-options", "features"] }
    ]
  }
}
\`\`\`

### Matching semantics

- Each column's \`types\` list is a **claim queue**, processed in order. Listing the same type twice (e.g. \`["markdown", "cta", "markdown"]\`) claims two blocks of that type.
- Columns are processed in order. For each listed type, the first unclaimed block of that type in the page's block array is taken. A type listed across two columns therefore splits the first two matching blocks between them.
- Blocks **inside a column** render in slot order (the order their types appear in the config), not the page's original block order.
- Unclaimed blocks — including duplicates beyond the queue length and any types not listed at all — fall through to the regular full-width rendering below the column section, preserving their original order.
- If no blocks match any column for a page, columns mode is disabled for that page and blocks render as normal. Ship an empty \`blockLayouts.json\` to keep the feature off by default.

### Disallowed block types

These block types are rejected at build time if listed inside any column (they need full viewport width or already use a two-pane layout):

${disallowedList}

### Rendering

Matched blocks render inside \`<section class="block-columns-section">\` → \`<div class="container-wide">\` → \`<div class="block-columns block-columns-N">\` (where \`N\` is the column count). Each column is a \`<div class="block-column">\` using flexbox to stack its children with consistent spacing. At mobile widths (below \`md\`), all columns collapse to a single stack.`;
};

const BEGIN_MARKER = "<!-- BEGIN GENERATED BLOCKS -->";
const END_MARKER = "<!-- END GENERATED BLOCKS -->";
const BEGIN_COLUMNS_MARKER = "<!-- BEGIN GENERATED BLOCK COLUMNS -->";
const END_COLUMNS_MARKER = "<!-- END GENERATED BLOCK COLUMNS -->";

const replaceBetween = (source, beginMarker, endMarker, generated) => {
  const beginIdx = source.indexOf(beginMarker);
  const endIdx = source.indexOf(endMarker);
  if (beginIdx === -1 || endIdx === -1) {
    throw new Error(
      `Missing markers in BLOCKS_LAYOUT.md. Add ${beginMarker} and ${endMarker} around the generated section.`,
    );
  }
  const before = source.slice(0, beginIdx + beginMarker.length);
  const after = source.slice(endIdx);
  return `${before}\n\n${generated}\n\n${after}`;
};

const existing = readFileSync(BLOCKS_LAYOUT_PATH, "utf-8");
const withBlocks = replaceBetween(
  existing,
  BEGIN_MARKER,
  END_MARKER,
  generateBlocksSection(),
);
const output = replaceBetween(
  withBlocks,
  BEGIN_COLUMNS_MARKER,
  END_COLUMNS_MARKER,
  generateMultiColumnSection(),
);
writeFileSync(BLOCKS_LAYOUT_PATH, output);

const typeCount = Object.keys(BLOCK_SCHEMAS).length;
console.log(
  `Generated ${typeCount} block type docs and multi-column reference in BLOCKS_LAYOUT.md`,
);
