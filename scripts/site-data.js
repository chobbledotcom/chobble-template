import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { globSync } from "tinyglobby";
import { ROOT_DIR } from "#lib/paths.js";

const IDENTITY_SOURCE = [
  "src/_data/{site,meta}.json",
  "src/pages/contact.md",
  "src/snippets/right-content.md",
];

const PLACEHOLDERS = [
  {
    label: "reserved example domain",
    pattern:
      /(?:[a-z0-9.-]+\.)?example\.(?:com|org|net)|[a-z0-9.-]+\.example\b/i,
  },
  {
    label: "placeholder identity",
    pattern:
      /\b(?:Example Site(?: Ltd)?|Example organization description|Your Site Name|Change Me|123 Example Street)\b/i,
  },
  {
    label: "placeholder phone number",
    pattern: /\b0161[\s-]+(?:000|123)[\s-]+\d{4}\b/,
  },
];

/**
 * Find obvious placeholder values in files that define the site's identity.
 * General documentation is deliberately excluded because reserved example
 * domains and sample names are legitimate content there.
 * @param {string} [rootDir]
 * @returns {string[]}
 */
export const collectPlaceholderDataErrors = (rootDir = ROOT_DIR) =>
  globSync(IDENTITY_SOURCE, {
    cwd: rootDir,
    absolute: true,
    onlyFiles: true,
  })
    .toSorted()
    .flatMap((filePath) => {
      const lines = readFileSync(filePath, "utf8").split("\n");
      return lines.flatMap((line, index) =>
        PLACEHOLDERS.flatMap(({ label, pattern }) =>
          pattern.test(line)
            ? [`${relative(rootDir, filePath)}:${index + 1}: ${label}`]
            : [],
        ),
      );
    });

/** @param {string} [rootDir] */
export const validateSiteData = (rootDir = ROOT_DIR) => {
  const errors = collectPlaceholderDataErrors(rootDir);
  if (errors.length > 0) {
    throw new Error(`Placeholder site data found:\n  ${errors.join("\n  ")}`);
  }
};
