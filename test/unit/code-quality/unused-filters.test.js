/**
 * Detects Eleventy filters and shortcodes that no template uses.
 *
 * The inverse gate to unregistered-collections: a filter registered in
 * src/_lib (via addFilter/addAsyncFilter/addShortcode/addAsyncShortcode
 * or the central FILTERS registry) with no `| name` / `{% name %}`
 * reference in any template is dead code — it ships, gets tested, and
 * rots without ever rendering a page. Delete the registration (and the
 * implementation, if nothing else uses it) instead of allowlisting.
 */
import { describe, expect, test } from "vitest";
import { configureGuides } from "#collections/guides.js";
import { configureNavigation } from "#collections/navigation.js";
import { configureBlocks } from "#eleventy/blocks.js";
import { configureBreadcrumbs } from "#eleventy/breadcrumbs.js";
import { configureCollectionLookup } from "#eleventy/collection-lookup.js";
import { configureFileUtils } from "#eleventy/file-utils.js";
import { configureFilters } from "#eleventy/filters.js";
import { configureStyleBundle } from "#eleventy/style-bundle.js";
import { configureIconify } from "#media/iconify.js";
import { configureImages } from "#media/image.js";
import { readSource } from "#test/code-scanner.js";
import {
  createExtractor,
  createMockEleventyConfig,
  getFiles,
} from "#test/test-utils.js";
import { unique } from "#utils/fp/array.js";

const REGISTRATION_PATTERN =
  /\.add(?:Async)?(?:Filter|Shortcode)\(\s*\n?\s*"([^"]+)"/g;

/** Every configure* module, so the helper-registered maps are seen too. */
const CONFIGURE_MODULES = [
  configureBlocks,
  configureBreadcrumbs,
  configureCollectionLookup,
  configureFileUtils,
  configureFilters,
  configureGuides,
  configureIconify,
  configureImages,
  configureNavigation,
  configureStyleBundle,
];

const REGISTRATION_MAPS = [
  "filters",
  "asyncFilters",
  "shortcodes",
  "asyncShortcodes",
];

const registeredNames = async () => {
  const mockConfig = createMockEleventyConfig();
  await Promise.all(
    CONFIGURE_MODULES.map((configure) => configure(mockConfig)),
  );
  const fromConfig = REGISTRATION_MAPS.flatMap((map) =>
    Object.keys(mockConfig[map] || {}),
  );
  return unique([
    ...fromConfig,
    ...createExtractor(REGISTRATION_PATTERN)(getFiles(/^src\/.*\.js$/)),
  ]);
};

/** Liquid usage forms: `| name` (filter) or `{% name %}` (shortcode). */
const usagePattern = (name) =>
  new RegExp(`(\\|\\s*${name}\\b|\\{%-?\\s*${name}\\b)`);

describe("unused-filters", () => {
  const templates = getFiles(/^src\/(?!_lib\/).*\.(html|liquid|md|xsl)$/)
    .map(readSource)
    .join("\n");

  test("every registered filter and shortcode is used by a template", async () => {
    const unused = (await registeredNames()).filter(
      (name) => !usagePattern(name).test(templates),
    );

    expect(
      unused,
      `Registered but never used in any template: ${unused.join(", ")}. ` +
        "Delete the registration (and implementation if nothing else needs it).",
    ).toEqual([]);
  });

  test("the scan sees known-good registrations and templates", async () => {
    const names = await registeredNames();
    for (const name of ["cacheBust", "image", "toNavigation", "getBySlug"]) {
      expect(names).toContain(name);
    }
    expect(usagePattern("cacheBust").test(templates)).toBe(true);
  });
});
