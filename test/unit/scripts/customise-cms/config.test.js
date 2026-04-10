import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { getRequiredCollections } from "#scripts/customise-cms/collections.js";
import {
  createDefaultConfig,
  loadCmsConfig,
  saveCmsConfig,
} from "#scripts/customise-cms/config.js";
import { withMockedCwdAsync, withTempDirAsync } from "#test/test-utils.js";
import {
  setupSiteJson,
  setupSiteJsonWithSrc,
} from "#test/unit/scripts/customise-cms/test-helpers.js";

const readSavedConfig = (dir, subpath = "_data/site.json") =>
  JSON.parse(readFileSync(`${dir}/${subpath}`, "utf-8"));

describe("customise-cms config", () => {
  describe("createDefaultConfig", () => {
    test("includes all selectable collections plus required ones", () => {
      const config = createDefaultConfig();
      expect(config.collections.length).toBeGreaterThan(10);
      expect(config.collections).toContain("pages");
      expect(config.collections).toContain("products");
      expect(config.collections).toContain("snippets");
    });

    test("enables all features except visual editor", () => {
      const { features } = createDefaultConfig();
      expect(features.permalinks).toBe(true);
      expect(features.faqs).toBe(true);
      expect(features.galleries).toBe(true);
      expect(features.add_ons).toBe(true);
      expect(features.use_visual_editor).toBe(false);
    });

    test("defaults to src folder and no custom home page", () => {
      const config = createDefaultConfig();
      expect(config.hasSrcFolder).toBe(true);
      expect(config.customHomePage).toBe(false);
    });
  });

  describe("loadCmsConfig", () => {
    test("reads cms_config from site.json", () =>
      withTempDirAsync("loadCmsConfig", (tempDir) => {
        setupSiteJson(tempDir, {
          name: "Test Site",
          cms_config: {
            collections: ["pages", "products"],
            features: { permalinks: true },
          },
        });

        return withMockedCwdAsync(tempDir, async () => {
          const config = await loadCmsConfig();
          expect(config.collections).toContain("pages");
          expect(config.collections).toContain("products");
          expect(config.features.permalinks).toBe(true);
        });
      }));

    test("merges required collections into loaded config", () =>
      withTempDirAsync("loadCmsConfig-required", (tempDir) => {
        setupSiteJson(tempDir, {
          cms_config: {
            collections: ["products"],
            features: {},
          },
        });

        return withMockedCwdAsync(tempDir, async () => {
          const config = await loadCmsConfig();
          const requiredNames = getRequiredCollections().map((c) => c.name);
          for (const name of requiredNames) {
            expect(config.collections).toContain(name);
          }
        });
      }));

    test("returns null when cms_config does not exist", () =>
      withTempDirAsync("loadCmsConfig-no-config", (tempDir) => {
        setupSiteJson(tempDir, { name: "Test Site" });

        return withMockedCwdAsync(tempDir, async () => {
          expect(await loadCmsConfig()).toBeNull();
        });
      }));

    test("returns null for empty site.json", () =>
      withTempDirAsync("loadCmsConfig-empty", (tempDir) => {
        setupSiteJson(tempDir, {});

        return withMockedCwdAsync(tempDir, async () => {
          expect(await loadCmsConfig()).toBeNull();
        });
      }));

    test("prefers src/_data/site.json over _data/site.json", () =>
      withTempDirAsync("loadCmsConfig-src", (tempDir) => {
        setupSiteJsonWithSrc(
          tempDir,
          { cms_config: { collections: ["pages"] } },
          { cms_config: { collections: ["products"] } },
        );

        return withMockedCwdAsync(tempDir, async () => {
          const config = await loadCmsConfig();
          expect(config.collections).toContain("products");
        });
      }));

    test("falls back to _data/site.json when src folder absent", () =>
      withTempDirAsync("loadCmsConfig-no-src", (tempDir) => {
        setupSiteJson(tempDir, {
          cms_config: { collections: ["events"] },
        });

        return withMockedCwdAsync(tempDir, async () => {
          const config = await loadCmsConfig();
          expect(config.collections).toContain("events");
        });
      }));
  });

  describe("saveCmsConfig", () => {
    test("writes cms_config while preserving other data", () =>
      withTempDirAsync("saveCmsConfig-preserve", (tempDir) => {
        setupSiteJson(tempDir, {
          name: "Test Site",
          url: "https://example.com",
        });

        return withMockedCwdAsync(tempDir, async () => {
          await saveCmsConfig({
            collections: ["pages", "products"],
            features: { permalinks: true },
            hasSrcFolder: true,
          });

          const saved = readSavedConfig(tempDir);
          expect(saved.cms_config.collections).toEqual(["pages", "products"]);
          expect(saved.name).toBe("Test Site");
          expect(saved.url).toBe("https://example.com");
        });
      }));

    test("overwrites existing cms_config", () =>
      withTempDirAsync("saveCmsConfig-update", (tempDir) => {
        setupSiteJson(tempDir, {
          cms_config: { collections: ["pages"] },
        });

        return withMockedCwdAsync(tempDir, async () => {
          await saveCmsConfig({
            collections: ["pages", "products", "news"],
            features: { permalinks: true },
            hasSrcFolder: true,
          });

          const saved = readSavedConfig(tempDir);
          expect(saved.cms_config.collections.length).toBe(3);
        });
      }));

    test("formats JSON with tabs and trailing newline", () =>
      withTempDirAsync("saveCmsConfig-format", (tempDir) => {
        setupSiteJson(tempDir, { name: "Test Site" });

        return withMockedCwdAsync(tempDir, async () => {
          await saveCmsConfig({ collections: ["pages"] });
          const content = readFileSync(`${tempDir}/_data/site.json`, "utf-8");
          expect(content).toContain("\t");
          expect(content.endsWith("\n")).toBe(true);
        });
      }));

    test("writes to src/_data when it exists", () =>
      withTempDirAsync("saveCmsConfig-src", (tempDir) => {
        setupSiteJsonWithSrc(
          tempDir,
          { name: "Root Site" },
          { name: "Src Site" },
        );

        return withMockedCwdAsync(tempDir, async () => {
          await saveCmsConfig({ collections: ["products"] });

          const srcData = readSavedConfig(tempDir, "src/_data/site.json");
          expect(srcData.cms_config).toEqual({ collections: ["products"] });

          const rootData = readSavedConfig(tempDir);
          expect(rootData.cms_config).toBeUndefined();
        });
      }));
  });
});
