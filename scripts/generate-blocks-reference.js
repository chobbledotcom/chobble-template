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
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BLOCK_DOCS, BLOCK_SCHEMAS } from "#utils/block-schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const BLOCKS_LAYOUT_PATH = path.join(ROOT_DIR, "BLOCKS_LAYOUT.md");

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

const renderMetaLines = (doc) => {
  const lines = [];
  if (doc.template) lines.push(`**Template:** \`${doc.template}\``);
  if (doc.scss) lines.push(`**SCSS:** \`${doc.scss}\``);
  if (doc.htmlRoot) lines.push(`**HTML root:** \`${doc.htmlRoot}\``);
  if (lines.length > 0) lines.push("");
  return lines;
};

const renderBlock = (type) => {
  const doc = BLOCK_DOCS[type];
  if (!doc) {
    throw new Error(`No BLOCK_DOCS entry for block type "${type}"`);
  }

  const lines = [`### \`${type}\`\n`, `${doc.summary}\n`];
  lines.push(...renderMetaLines(doc));

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

const BEGIN_MARKER = "<!-- BEGIN GENERATED BLOCKS -->";
const END_MARKER = "<!-- END GENERATED BLOCKS -->";

const existing = readFileSync(BLOCKS_LAYOUT_PATH, "utf-8");
const beginIdx = existing.indexOf(BEGIN_MARKER);
const endIdx = existing.indexOf(END_MARKER);

if (beginIdx === -1 || endIdx === -1) {
  throw new Error(
    `Missing markers in BLOCKS_LAYOUT.md. Add ${BEGIN_MARKER} and ${END_MARKER} around the Block Types section.`,
  );
}

const before = existing.slice(0, beginIdx + BEGIN_MARKER.length);
const after = existing.slice(endIdx);
const generated = generateBlocksSection();

const output = `${before}\n\n${generated}\n\n${after}`;
writeFileSync(BLOCKS_LAYOUT_PATH, output);

const typeCount = Object.keys(BLOCK_SCHEMAS).length;
console.log(`Generated ${typeCount} block type docs in BLOCKS_LAYOUT.md`);
