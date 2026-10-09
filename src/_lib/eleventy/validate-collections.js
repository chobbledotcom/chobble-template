/**
 * Build-time validation of collection references.
 *
 * Ensures every `collections.foo` or `collections["foo"]` referenced in
 * templates corresponds to a registered Eleventy collection. Catches typos
 * and references to non-existent collections that would silently return
 * undefined at build time.
 *
 * Uses static analysis to discover both registered collection names
 * (from addCollection calls and directory data tags) and template
 * references (from .html and .liquid files). Runs before the build
 * starts so errors are caught early.
 */
import fs from "node:fs";
import path from "node:path";
import { SRC_DIR } from "#lib/paths.js";
import { frozenSet } from "#utils/fp/set.js";

/** Liquid properties that look like collection names but are not */
const IGNORED_PROPERTIES = frozenSet(["size", "length"]);

/** Match .addCollection("name" in JS source files */
const ADD_COLLECTION_PATTERN = /\.addCollection\(\s*"([^"]+)"/g;

/** Match tags: ["name"] in directory data (JSON, or JS like directory-data.js) */
const TAG_ARRAY_PATTERN = /"?tags"?\s*:\s*\[\s*"([^"]+)"\s*\]/g;

/** Match tags: "name" in directory data (JSON, or JS) */
const TAG_STRING_PATTERN = /"?tags"?\s*:\s*"([^"]+)"/g;

/** Match collections.NAME (dot notation) in templates */
const DOT_ACCESS_PATTERN = /collections\.([a-zA-Z_][\w-]*)/g;

/** Match collections["NAME"] (bracket notation) in templates */
const BRACKET_ACCESS_PATTERN = /collections\["([^"]+)"\]/g;

const TEMPLATE_EXTENSIONS = frozenSet([".html", ".liquid"]);

/**
 * Recursively collect all files matching a predicate.
 * @param {string} dir
 * @param {(name: string) => boolean} predicate
 * @returns {string[]}
 */
const collectFiles = (dir, predicate) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath, predicate);
    return predicate(entry.name) ? [fullPath] : [];
  });

/**
 * Extract collection names from files matching a predicate, using the
 * regex's group-1 matches.
 * @param {string} srcDir
 * @param {(name: string) => boolean} filePredicate
 * @param {RegExp} pattern
 * @returns {string[]}
 */
const extractNamesFromFiles = (srcDir, filePredicate, pattern) =>
  collectFiles(srcDir, filePredicate).flatMap((file) =>
    [...fs.readFileSync(file, "utf-8").matchAll(pattern)].map((m) => m[1]),
  );

/**
 * Build the set of all registered collection names from source files.
 * @param {string} srcDir
 */
const buildRegisteredNames = (srcDir) =>
  frozenSet([
    "all",
    ...extractNamesFromFiles(
      srcDir,
      (n) => n.endsWith(".js"),
      ADD_COLLECTION_PATTERN,
    ),
    ...[TAG_ARRAY_PATTERN, TAG_STRING_PATTERN].flatMap((pattern) =>
      extractNamesFromFiles(
        srcDir,
        (n) => n.endsWith(".js") || n.endsWith(".json"),
        pattern,
      ),
    ),
  ]);

/**
 * Find all template collection references that are not registered.
 * @param {string} srcDir
 * @param {ReadonlySet<string>} registeredNames
 */
const findViolations = (srcDir, registeredNames) =>
  collectFiles(srcDir, (name) =>
    TEMPLATE_EXTENSIONS.has(path.extname(name)),
  ).flatMap((filePath) =>
    fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .flatMap((line, i) =>
        [
          ...line.matchAll(DOT_ACCESS_PATTERN),
          ...line.matchAll(BRACKET_ACCESS_PATTERN),
        ]
          .map((m) => ({
            name: m[1],
            file: path.relative(srcDir, filePath),
            line: i + 1,
          }))
          .filter(
            (ref) =>
              !registeredNames.has(ref.name) &&
              !IGNORED_PROPERTIES.has(ref.name),
          ),
      ),
  );

/**
 * Configure build-time collection validation.
 *
 * Runs static analysis before the build starts to catch references to
 * unregistered collections. Template typos like `collections.produts`
 * will fail the build immediately.
 *
 * @param {import("#lib/types").UserConfig} eleventyConfig
 */
export const configureCollectionValidation = (
  eleventyConfig,
  srcDir = SRC_DIR,
) => {
  eleventyConfig.on("eleventy.before", () => {
    const registeredNames = buildRegisteredNames(srcDir);
    const violations = findViolations(srcDir, registeredNames);

    if (violations.length > 0) {
      const details = violations
        .map((v) => `  - ${v.file}:${v.line} → collections.${v.name}`)
        .join("\n");
      throw new Error(
        "Unregistered collection references found:\n" +
          `${details}\n\nRegister via addCollection() or fix the typo.`,
      );
    }
  });
};
