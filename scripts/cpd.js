#!/usr/bin/env node

/**
 * jscpd runner that prints actionable guidance when duplication is found.
 *
 * jscpd's console report tells you where the duplication is, but not what to
 * do next. This wrapper runs jscpd unchanged and forwards every arg, then
 * appends the project's duplication policy plus the affected clone spans when
 * the check fails.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT_DIR } from "#lib/paths.js";

const JSCPD_REPORT = join(ROOT_DIR, ".jscpd-report", "jscpd-report.json");
const MAX_DUPLICATES_TO_SHOW = 5;
const MAX_EXCERPT_LINES = 20;

export const buildCpdFailureMessage = () => `
jscpd found duplicated code.

Do not use /* jscpd:ignore */ to silence it. Fix the duplication:

  1. Write a helper. This is the answer in almost every case. If an obvious
     shared function jumps out, extract it and call it from both sites.

  2. No obvious helper? Curry. Lift the parts that differ into arguments of a
     function that returns the specialised version, then call it at each site.
     Review the result before committing. The first small curry you reach for
     is often not the best one; a larger, more holistic curry across the call
     sites is frequently better.

  3. jscpd:ignore is the last resort. It is excusable for basically one thing:
     import blocks. If the duplicated code is not an import block, you almost
     certainly want option 1 or 2.
`;

export const loadCpdReport = () => {
  try {
    return JSON.parse(readFileSync(JSCPD_REPORT, "utf-8"));
  } catch {
    return null;
  }
};

const resolveReportFile = (fileName) => {
  if (!fileName) return null;

  const fullPath = isAbsolute(fileName) ? fileName : join(ROOT_DIR, fileName);
  const relativePath = relative(ROOT_DIR, fullPath);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) return null;
  return fullPath;
};

export const buildSourceExcerptLines = ({ name, start, end }) => {
  const filePath = resolveReportFile(name);
  if (!filePath) return ["    (source unavailable)"];

  try {
    const sourceLines = readFileSync(filePath, "utf-8").split(/\r?\n/);
    const firstLine = Math.max(1, start);
    const lastLine = Math.min(end, firstLine + MAX_EXCERPT_LINES - 1);
    const width = String(lastLine).length;
    const lines = sourceLines
      .slice(firstLine - 1, lastLine)
      .map(
        (line, index) =>
          `    ${String(firstLine + index).padStart(width, " ")} | ${line}`,
      );

    if (end > lastLine) lines.push(`    ... (${end - lastLine} more lines)`);
    return lines.length > 0 ? lines : ["    (source unavailable)"];
  } catch {
    return ["    (source unavailable)"];
  }
};

export const buildCpdDuplicateLines = (duplicate) => {
  const firstFile = duplicate?.firstFile;
  const secondFile = duplicate?.secondFile;

  if (!firstFile || !secondFile) return [];

  const lines = [
    `❌ Clone found (${duplicate.format}, ${duplicate.lines} lines)`,
    `  ${firstFile.name}: ${firstFile.start}-${firstFile.end}`,
    "  Duplicated lines:",
    ...buildSourceExcerptLines(firstFile),
    `  ${secondFile.name}: ${secondFile.start}-${secondFile.end}`,
    "  Duplicated lines:",
    ...buildSourceExcerptLines(secondFile),
  ];

  if (duplicate.fragment) {
    lines.push("  Normalized duplicate fragment:");
    lines.push(
      ...String(duplicate.fragment)
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => `    ${line}`),
    );
  }

  return lines;
};

export const buildCpdFailureLines = (report) => {
  const duplicates = report?.duplicates || [];
  const lines = [];

  if (duplicates.length > 0) {
    lines.push("❌ jscpd found duplicated code");

    for (const duplicate of duplicates.slice(0, MAX_DUPLICATES_TO_SHOW)) {
      lines.push(...buildCpdDuplicateLines(duplicate));
    }

    if (duplicates.length > MAX_DUPLICATES_TO_SHOW) {
      lines.push(
        `  ... and ${duplicates.length - MAX_DUPLICATES_TO_SHOW} more duplicate block(s)`,
      );
    }

    lines.push("");
  }

  lines.push(buildCpdFailureMessage().trim());
  return lines;
};

export const throwIfSpawnFailed = (result, commandName) => {
  if (result.error) {
    throw new Error(`Failed to run ${commandName}: ${result.error.message}`);
  }
};

export const runCpd = (args = []) => {
  const result = spawnSync("bunx", ["jscpd", ...args], {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

  throwIfSpawnFailed(result, "jscpd");

  if ((result.status ?? 1) !== 0) {
    const report = loadCpdReport();
    for (const line of buildCpdFailureLines(report)) {
      console.error(line);
    }
  }

  return result.status ?? 1;
};

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMainModule) {
  process.exit(runCpd(process.argv.slice(2)));
}
