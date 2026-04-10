import { describe, expect, test } from "bun:test";
import {
  ALL_COLLECTIONS,
  ALL_FEATURES,
  buildConfigFromCli,
  formatCollection,
  generateHelp,
  getCliOptions,
  handleListOptions,
  hasCliFlags,
} from "#scripts/customise-cms/cli.js";

describe("customise-cms CLI", () => {
  describe("hasCliFlags", () => {
    test("returns false for empty values, help-only, and list options", () => {
      expect(hasCliFlags({})).toBe(false);
      expect(hasCliFlags({ help: true })).toBe(false);
      expect(hasCliFlags({ "list-collections": true })).toBe(false);
      expect(hasCliFlags({ "list-features": true })).toBe(false);
    });

    test("returns true for any actionable flag", () => {
      const actionableFlags = [
        { collections: "pages,products" },
        { all: true },
        { enable: "faqs,galleries" },
        { disable: "use_visual_editor" },
        { "dry-run": true },
        { quiet: true },
        { regenerate: true },
      ];
      for (const flags of actionableFlags) {
        expect(hasCliFlags(flags)).toBe(true);
      }
    });
  });

  describe("buildConfigFromCli", () => {
    test("--all enables all collections and features", () => {
      const config = buildConfigFromCli({ all: true });
      expect(config.collections).toContain("products");
      expect(config.collections).toContain("news");
      expect(config.features.permalinks).toBe(true);
      expect(config.features.faqs).toBe(true);
    });

    test("always includes required collections (pages, snippets)", () => {
      const config = buildConfigFromCli({ collections: "products" });
      expect(config.collections).toContain("snippets");
      expect(config.collections).toContain("pages");
    });

    test("parses comma-separated collections and resolves dependencies", () => {
      const config = buildConfigFromCli({
        collections: "products,news,events",
      });
      expect(config.collections).toContain("products");
      expect(config.collections).toContain("news");
      expect(config.collections).toContain("events");
      expect(config.collections).toContain("categories");
    });

    test("starts with all features disabled without --all", () => {
      const config = buildConfigFromCli({ collections: "pages" });
      expect(config.features.permalinks).toBe(false);
      expect(config.features.faqs).toBe(false);
      expect(config.features.use_visual_editor).toBe(false);
    });

    test("--enable enables specified features", () => {
      const { features } = buildConfigFromCli({
        collections: "pages",
        enable: "faqs,galleries,permalinks",
      });
      expect(features.faqs).toBe(true);
      expect(features.galleries).toBe(true);
      expect(features.permalinks).toBe(true);
      expect(features.use_visual_editor).toBe(false);
    });

    test("--disable disables features even with --all", () => {
      const { features } = buildConfigFromCli({
        all: true,
        disable: "use_visual_editor,faqs",
      });
      expect(features.use_visual_editor).toBe(false);
      expect(features.faqs).toBe(false);
      expect(features.galleries).toBe(true);
    });

    test("--disable overrides --enable for the same feature", () => {
      const { features } = buildConfigFromCli({
        collections: "pages",
        enable: "faqs,galleries,permalinks",
        disable: "permalinks",
      });
      expect(features.permalinks).toBe(false);
      expect(features.faqs).toBe(true);
      expect(features.galleries).toBe(true);
    });

    test("respects src-folder and custom-home flags", () => {
      const noSrc = buildConfigFromCli({
        collections: "pages",
        "no-src-folder": true,
      });
      expect(noSrc.hasSrcFolder).toBe(false);

      const withSrc = buildConfigFromCli({
        collections: "pages",
        "src-folder": true,
      });
      expect(withSrc.hasSrcFolder).toBe(true);

      const customHome = buildConfigFromCli({
        collections: "pages",
        "custom-home": true,
      });
      expect(customHome.customHomePage).toBe(true);

      const noCustomHome = buildConfigFromCli({
        collections: "pages",
        "no-custom-home": true,
      });
      expect(noCustomHome.customHomePage).toBe(false);
    });

    test("defaults hasSrcFolder to true and customHomePage to false", () => {
      const config = buildConfigFromCli({ collections: "pages" });
      expect(config.hasSrcFolder).toBe(true);
      expect(config.customHomePage).toBe(false);
    });

    test("throws on unknown collection", () => {
      expect(() => {
        buildConfigFromCli({ collections: "pages,unknown-collection" });
      }).toThrow(/Unknown collection.*unknown-collection/);
    });

    test("throws on unknown feature", () => {
      expect(() => {
        buildConfigFromCli({ collections: "pages", enable: "unknown-feature" });
      }).toThrow(/Unknown feature.*unknown-feature/);

      expect(() => {
        buildConfigFromCli({
          collections: "pages",
          disable: "unknown-feature",
        });
      }).toThrow(/Unknown feature.*unknown-feature/);
    });

    test("handles whitespace in comma-separated values", () => {
      const config = buildConfigFromCli({
        collections: " products , news , events ",
        enable: " faqs , galleries ",
      });
      expect(config.collections).toContain("products");
      expect(config.features.faqs).toBe(true);
    });
  });

  describe("getCliOptions", () => {
    test("returns correct defaults", () => {
      const options = getCliOptions({});
      expect(options.saveConfig).toBe(true);
      expect(options.dryRun).toBe(false);
      expect(options.quiet).toBe(false);
    });

    test("respects flag overrides", () => {
      expect(getCliOptions({ "no-save-config": true }).saveConfig).toBe(false);
      expect(getCliOptions({ "dry-run": true }).dryRun).toBe(true);
      expect(getCliOptions({ quiet: true }).quiet).toBe(true);
    });
  });

  describe("handleListOptions", () => {
    test("returns false when no list flags provided", () => {
      expect(handleListOptions({})).toBe(false);
      expect(handleListOptions({ all: true })).toBe(false);
    });

    test("returns true for list flags", () => {
      expect(handleListOptions({ "list-collections": true })).toBe(true);
      expect(handleListOptions({ "list-features": true })).toBe(true);
    });
  });

  describe("generateHelp", () => {
    test("includes usage info, collections, features, and examples", () => {
      const help = generateHelp();
      expect(help).toContain("Usage:");
      expect(help).toContain("--collections");
      expect(help).toContain("products");
      expect(help).toContain("permalinks");
      expect(help).toContain("EXAMPLES:");
    });
  });

  describe("formatCollection", () => {
    test("formats collection with flags when present", () => {
      const plain = formatCollection({
        name: "products",
        description: "Products for sale",
      });
      expect(plain).toContain("products");
      expect(plain).not.toContain("required");

      const required = formatCollection({
        name: "pages",
        description: "Static pages",
        required: true,
      });
      expect(required).toContain("(required)");

      const both = formatCollection({
        name: "snippets",
        description: "Reusable content",
        required: true,
        internal: true,
      });
      expect(both).toContain("(required, internal)");
    });
  });

  describe("constant integrity", () => {
    test("ALL_COLLECTIONS and ALL_FEATURES cover expected entries", () => {
      expect(ALL_COLLECTIONS).toContain("pages");
      expect(ALL_COLLECTIONS).toContain("products");
      expect(ALL_COLLECTIONS.length).toBeGreaterThan(10);

      expect(ALL_FEATURES).toContain("permalinks");
      expect(ALL_FEATURES).toContain("use_visual_editor");
      expect(ALL_FEATURES.length).toBeGreaterThan(10);
    });
  });
});
