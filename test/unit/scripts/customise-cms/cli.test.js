import { describe, expect, test } from "vitest";
import {
  buildConfigFromCli,
  generateHelp,
  getCliOptions,
  handleListOptions,
  hasCliFlags,
} from "#scripts/customise-cms/cli.js";
import { captureConsole } from "#test/test-utils.js";

describe("hasCliFlags", () => {
  test("returns false for empty values", () => {
    expect(hasCliFlags({})).toBe(false);
  });

  test("returns false for help-only or list-only flags", () => {
    expect(hasCliFlags({ help: true })).toBe(false);
    expect(hasCliFlags({ "list-collections": true })).toBe(false);
    expect(hasCliFlags({ "list-features": true })).toBe(false);
  });

  test.each([
    ["collections", { collections: "pages,news" }],
    ["all", { all: true }],
    ["enable", { enable: "faqs" }],
    ["disable", { disable: "faqs" }],
    ["dry-run", { "dry-run": true }],
    ["quiet", { quiet: true }],
    ["regenerate", { regenerate: true }],
    ["custom-blocks-collections", { "custom-blocks-collections": "clients" }],
  ])("returns true when %s is provided", (_label, values) => {
    expect(hasCliFlags(values)).toBe(true);
  });
});

describe("buildConfigFromCli", () => {
  test("--all enables all collections and features", () => {
    const config = buildConfigFromCli({ all: true });

    expect(config.collections.length).toBeGreaterThanOrEqual(5);
    expect(config.features.permalinks).toBe(true);
    expect(config.features.faqs).toBe(true);
    expect(config.features.galleries).toBe(true);
  });

  test("always includes required collections", () => {
    const config = buildConfigFromCli({ collections: "news" });

    expect(config.collections).toContain("pages");
    expect(config.collections).toContain("snippets");
  });

  test("resolves dependencies for requested collections", () => {
    const config = buildConfigFromCli({ collections: "guide-pages,news" });

    expect(config.collections).toContain("guide-categories");
  });

  test("starts with all features disabled without --all", () => {
    const config = buildConfigFromCli({ collections: "pages" });

    expect(config.features.permalinks).toBe(false);
    expect(config.features.faqs).toBe(false);
  });

  test("--enable selectively enables features", () => {
    const config = buildConfigFromCli({
      collections: "pages",
      enable: "faqs,galleries",
    });

    expect(config.features).toMatchObject({
      faqs: true,
      galleries: true,
      permalinks: false,
    });
  });

  test("--disable selectively disables features from --all", () => {
    const config = buildConfigFromCli({
      all: true,
      disable: "permalinks,faqs",
    });

    expect(config.features.permalinks).toBe(false);
    expect(config.features.faqs).toBe(false);
    expect(config.features.galleries).toBe(true);
  });

  test("--disable overrides --enable for same feature", () => {
    const config = buildConfigFromCli({
      collections: "pages",
      enable: "faqs,permalinks",
      disable: "permalinks",
    });

    expect(config.features.faqs).toBe(true);
    expect(config.features.permalinks).toBe(false);
  });

  test("--no-src-folder and --src-folder control hasSrcFolder", () => {
    const noSrc = buildConfigFromCli({
      collections: "pages",
      "no-src-folder": true,
    });
    const withSrc = buildConfigFromCli({
      collections: "pages",
      "src-folder": true,
    });

    expect(noSrc.hasSrcFolder).toBe(false);
    expect(withSrc.hasSrcFolder).toBe(true);
  });

  test("defaults hasSrcFolder to true", () => {
    const config = buildConfigFromCli({ collections: "pages" });

    expect(config.hasSrcFolder).toBe(true);
  });

  test("--custom-blocks-collections parses comma-separated list", () => {
    const config = buildConfigFromCli({
      collections: "pages",
      "custom-blocks-collections": "clients,services",
    });

    expect(config.customBlocksCollections).toEqual(["clients", "services"]);
  });

  test("defaults customBlocksCollections to empty array", () => {
    const config = buildConfigFromCli({ collections: "pages" });

    expect(config.customBlocksCollections).toEqual([]);
  });

  test("handles whitespace in comma-separated values", () => {
    const config = buildConfigFromCli({
      collections: " guide-categories , news ",
      enable: " faqs , galleries ",
    });

    expect(config.collections).toContain("guide-categories");
    expect(config.collections).toContain("news");
    expect(config.features.faqs).toBe(true);
  });

  test("throws on unknown collection", () => {
    expect(() => {
      buildConfigFromCli({ collections: "pages,nonexistent" });
    }).toThrow(/Unknown collection.*nonexistent/);
  });

  test("throws on unknown feature in --enable", () => {
    expect(() => {
      buildConfigFromCli({ collections: "pages", enable: "nonexistent" });
    }).toThrow(/Unknown feature.*nonexistent/);
  });

  test("throws on unknown feature in --disable", () => {
    expect(() => {
      buildConfigFromCli({ collections: "pages", disable: "nonexistent" });
    }).toThrow(/Unknown feature.*nonexistent/);
  });
});

describe("getCliOptions", () => {
  test("defaults to save enabled, dryRun and quiet disabled", () => {
    const options = getCliOptions({});

    expect(options.saveConfig).toBe(true);
    expect(options.dryRun).toBe(false);
    expect(options.quiet).toBe(false);
  });

  test("respects --no-save-config, --dry-run, and --quiet", () => {
    const options = getCliOptions({
      "no-save-config": true,
      "dry-run": true,
      quiet: true,
    });

    expect(options.saveConfig).toBe(false);
    expect(options.dryRun).toBe(true);
    expect(options.quiet).toBe(true);
  });
});

describe("generateHelp", () => {
  test("includes usage, options, collections, features, and examples", () => {
    const help = generateHelp();

    expect(help).toContain("Usage: npm run customise-cms -- [options]");
    expect(help).toContain("--collections");
    expect(help).toContain("pages");
    expect(help).toContain("permalinks");
    expect(help).toContain("EXAMPLES:");
  });
});

describe("handleListOptions output", () => {
  test("collection listing shows names, flags, and descriptions", () => {
    const lines = captureConsole(() => {
      handleListOptions({ "list-collections": true });
    });

    const output = lines.join("\n");
    expect(output).toContain("pages (required)");
    expect(output).toContain("snippets (required, internal)");
    expect(output).toContain("Blog posts and news articles");
  });
});

describe("handleListOptions", () => {
  test("returns false when no list flags provided", () => {
    expect(handleListOptions({})).toBe(false);
    expect(handleListOptions({ all: true })).toBe(false);
  });

  test("returns true for --list-collections", () => {
    expect(handleListOptions({ "list-collections": true })).toBe(true);
  });

  test("returns true for --list-features", () => {
    expect(handleListOptions({ "list-features": true })).toBe(true);
  });
});
