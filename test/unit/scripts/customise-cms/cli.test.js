import { describe, expect, test } from "bun:test";
import {
  buildConfigFromCli,
  formatCollection,
  generateHelp,
  getCliOptions,
  handleListOptions,
  hasCliFlags,
} from "#scripts/customise-cms/cli.js";

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
    ["collections", { collections: "pages,products" }],
    ["all", { all: true }],
    ["enable", { enable: "faqs" }],
    ["disable", { disable: "use_visual_editor" }],
    ["dry-run", { "dry-run": true }],
    ["quiet", { quiet: true }],
    ["regenerate", { regenerate: true }],
    ["use-blocks", { "use-blocks": true }],
    ["custom-blocks-collections", { "custom-blocks-collections": "clients" }],
  ])("returns true when %s is provided", (_label, values) => {
    expect(hasCliFlags(values)).toBe(true);
  });
});

describe("buildConfigFromCli", () => {
  test("--all enables all collections and features", () => {
    const config = buildConfigFromCli({ all: true });

    expect(config.collections.length).toBeGreaterThan(10);
    expect(config.features.permalinks).toBe(true);
    expect(config.features.faqs).toBe(true);
    expect(config.features.galleries).toBe(true);
  });

  test("always includes required collections", () => {
    const config = buildConfigFromCli({ collections: "products" });

    expect(config.collections).toContain("pages");
    expect(config.collections).toContain("snippets");
  });

  test("resolves dependencies for requested collections", () => {
    const config = buildConfigFromCli({ collections: "products,news,events" });

    expect(config.collections).toContain("categories");
  });

  test("starts with all features disabled without --all", () => {
    const config = buildConfigFromCli({ collections: "pages" });

    expect(config.features.permalinks).toBe(false);
    expect(config.features.faqs).toBe(false);
    expect(config.features.use_visual_editor).toBe(false);
  });

  test("--enable selectively enables features", () => {
    const config = buildConfigFromCli({
      collections: "pages",
      enable: "faqs,galleries",
    });

    expect(config.features.faqs).toBe(true);
    expect(config.features.galleries).toBe(true);
    expect(config.features.use_visual_editor).toBe(false);
  });

  test("--disable selectively disables features from --all", () => {
    const config = buildConfigFromCli({
      all: true,
      disable: "use_visual_editor,faqs",
    });

    expect(config.features.use_visual_editor).toBe(false);
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

  test("--custom-home and --no-custom-home control customHomePage", () => {
    const custom = buildConfigFromCli({
      collections: "pages",
      "custom-home": true,
    });
    const noCustom = buildConfigFromCli({
      collections: "pages",
      "no-custom-home": true,
    });

    expect(custom.customHomePage).toBe(true);
    expect(noCustom.customHomePage).toBe(false);
  });

  test("defaults hasSrcFolder to true and customHomePage to false", () => {
    const config = buildConfigFromCli({ collections: "pages" });

    expect(config.hasSrcFolder).toBe(true);
    expect(config.customHomePage).toBe(false);
  });

  test("--use-blocks and --no-use-blocks control blocks feature", () => {
    const enabled = buildConfigFromCli({
      collections: "pages",
      "use-blocks": true,
    });
    const disabled = buildConfigFromCli({
      all: true,
      "no-use-blocks": true,
    });

    expect(enabled.features.use_blocks).toBe(true);
    expect(disabled.features.use_blocks).toBe(false);
  });

  test("--custom-blocks-collections parses comma-separated list", () => {
    const config = buildConfigFromCli({
      collections: "pages",
      "use-blocks": true,
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
      collections: " products , news ",
      enable: " faqs , galleries ",
    });

    expect(config.collections).toContain("products");
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

    expect(help).toContain("Usage:");
    expect(help).toContain("--collections");
    expect(help).toContain("pages");
    expect(help).toContain("permalinks");
    expect(help).toContain("EXAMPLES:");
  });
});

describe("formatCollection", () => {
  test("formats name and description", () => {
    const result = formatCollection({
      name: "products",
      description: "Products for sale",
    });

    expect(result).toContain("products");
    expect(result).toContain("Products for sale");
  });

  test("includes required flag when present", () => {
    const result = formatCollection({
      name: "pages",
      description: "Static pages",
      required: true,
    });

    expect(result).toContain("(required)");
  });

  test("includes both required and internal flags", () => {
    const result = formatCollection({
      name: "snippets",
      description: "Reusable content",
      required: true,
      internal: true,
    });

    expect(result).toContain("(required, internal)");
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
