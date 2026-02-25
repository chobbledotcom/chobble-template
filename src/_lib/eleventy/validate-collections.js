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
import { frozenSet } from "#toolkit/fp/set.js";

/** Liquid properties that look like collection names but are not */
const IGNORED_PROPERTIES = frozenSet(["size", "length"]);

/** Match .addCollection("name" in JS source files */
const ADD_COLLECTION_PATTERN = /\.addCollection\(\s*"([^"]+)"/g;

/** Match "tags": ["name"] in directory data JSON files */
const TAG_ARRAY_PATTERN = /"tags"\s*:\s*\[\s*"([^"]+)"\s*\]/g;

/** Match "tags": "name" in directory data JSON files */
const TAG_STRING_PATTERN = /"tags"\s*:\s*"([^"]+)"/g;

/** Match collections.NAME (dot notation) in templates */
const DOT_ACCESS_PATTERN = /collections\.([a-zA-Z_][\w-]*)/g;

/** Match collections["NAME"] (bracket notation) in templates */
const BRACKET_ACCESS_PATTERN = /collections\["([^"]+)"\]/g;

/** Dynamic collection name patterns from configure-filters.js */
const FILTER_CONFIG_PATTERN = /(?:pages|redirects|attributes)\s*:\s*"([^"]+)"/g;
const CATEGORY_KEY_PATTERN = /^\s+(\w+)\s*:/gm;

const TEMPLATE_EXTENSIONS = frozenSet([".html", ".liquid"]);

/**
 * Recursively collect all files matching a predicate.
 */
const collectFiles = (dir, predicate) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath, predicate);
    return predicate(entry.name) ? [fullPath] : [];
  });

/**
 * Extract all regex group-1 matches from content.
 */
const extractAllMatches = (content, pattern) =>
  [...content.matchAll(pattern)].map((m) => m[1]);

/**
 * Extract collection names from files matching a predicate, using a regex.
 */
const extractNamesFromFiles = (srcDir, filePredicate, pattern) =>
  collectFiles(srcDir, filePredicate).flatMap((file) =>
    extractAllMatches(fs.readFileSync(file, "utf-8"), pattern),
  );

/**
 * Build the set of all registered collection names from source files.
 */
const buildRegisteredNames = (srcDir) => {
  const configPath = path.join(
    srcDir,
    "_lib",
    "filters",
    "configure-filters.js",
  );
  const filterSource = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, "utf-8")
    : "";
  const filterNames = extractAllMatches(filterSource, FILTER_CONFIG_PATTERN);
  return frozenSet([
    "all",
    ...extractNamesFromFiles(
      srcDir,
      (n) => n.endsWith(".js"),
      ADD_COLLECTION_PATTERN,
    ),
    ...[TAG_ARRAY_PATTERN, TAG_STRING_PATTERN].flatMap((pattern) =>
      extractNamesFromFiles(srcDir, (n) => n.endsWith(".json"), pattern),
    ),
    ...filterNames,
    ...extractAllMatches(filterSource, CATEGORY_KEY_PATTERN),
    ...filterNames
      .filter((n) => n.startsWith("filtered"))
      .map((n) => `${n}ListingFilterUI`),
  ]);
};

/**
 * Find all template collection references that are not registered.
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
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
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
