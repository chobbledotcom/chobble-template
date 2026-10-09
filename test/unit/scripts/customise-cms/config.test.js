import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  getCollection,
  getRequiredCollections,
} from "#scripts/customise-cms/collections.js";
import {
  createDefaultConfig,
  createEmptyConfig,
  loadCmsConfig,
  saveCmsConfig,
} from "#scripts/customise-cms/config.js";
import { withTempDirAsync } from "#test/test-utils.js";

/**
 * Set up a test directory with _data folder and site.json file
 * @param {string} tempDir
 * @param {Object} siteData
 */
const setupSiteJson = (tempDir, siteData) => {
  mkdirSync(`${tempDir}/_data`, { recursive: true });
  writeFileSync(`${tempDir}/_data/site.json`, JSON.stringify(siteData));
};

/**
 * Set up test directories with both _data and src/_data
 * @param {string} tempDir
 * @param {Object} rootData
 * @param {Object} srcData
 */
const setupSiteJsonWithSrc = (tempDir, rootData, srcData) => {
  mkdirSync(`${tempDir}/_data`, { recursive: true });
  mkdirSync(`${tempDir}/src/_data`, { recursive: true });
  writeFileSync(`${tempDir}/_data/site.json`, JSON.stringify(rootData));
  writeFileSync(`${tempDir}/src/_data/site.json`, JSON.stringify(srcData));
};

describe("createDefaultConfig", () => {
  const config = createDefaultConfig();

  test("includes all non-internal collections", () => {
    expect(config.collections).toContain("pages");
    expect(config.collections).toContain("news");
    expect(config.collections).toContain("guide-categories");
    expect(config.collections).toContain("guide-pages");
    expect(config.collections).toContain("snippets");
    expect(config.collections).toHaveLength(5);
  });

  test("only includes registered collections", () => {
    expect(config.collections.every((name) => getCollection(name))).toBe(true);
  });

  test("enables every feature flag", () => {
    expect(config.features.faqs).toBe(true);
    expect(config.features.galleries).toBe(true);
    expect(config.features.permalinks).toBe(true);
    expect(config.features.redirects).toBe(true);
    expect(config.features.external_navigation_urls).toBe(true);
    expect(config.features.no_index).toBe(true);
  });

  test("defaults to src folder", () => {
    expect(config.hasSrcFolder).toBe(true);
  });
});

describe("loadCmsConfig", () => {
  test("rejects a saved feature the generator no longer offers", () =>
    withTempDirAsync("loadCmsConfig-retired", async (tempDir) => {
      setupSiteJson(tempDir, {
        cms_config: {
          collections: ["pages"],
          features: { faqs: true, use_visual_editor: false },
        },
      });

      await expect(loadCmsConfig(tempDir)).rejects.toThrow(
        "site.json cms_config.features has unknown keys: use_visual_editor.",
      );
    }));

  test("reads cms_config from site.json", () =>
    withTempDirAsync("loadCmsConfig", async (tempDir) => {
      setupSiteJson(tempDir, {
        name: "Test Site",
        cms_config: {
          collections: ["pages", "news"],
          features: { permalinks: true },
        },
      });

      const config = await loadCmsConfig(tempDir);
      expect(config.collections).toContain("pages");
      expect(config.collections).toContain("news");
      expect(config.features.permalinks).toBe(true);
    }));

  test("merges required collections into loaded config", () =>
    withTempDirAsync("loadCmsConfig-required", async (tempDir) => {
      setupSiteJson(tempDir, {
        name: "Test Site",
        cms_config: { collections: ["news"], features: {} },
      });

      const config = await loadCmsConfig(tempDir);
      const requiredNames = getRequiredCollections().map((c) => c.name);
      for (const name of requiredNames) {
        expect(config.collections).toContain(name);
      }
    }));

  test("defaults hasSrcFolder for configs saved before the flag existed", () =>
    withTempDirAsync("loadCmsConfig-src-default", async (tempDir) => {
      setupSiteJson(tempDir, {
        cms_config: { collections: ["pages"], features: {} },
      });

      const config = await loadCmsConfig(tempDir);
      expect(config.hasSrcFolder).toBe(true);
    }));

  test("returns null when cms_config is absent", () =>
    withTempDirAsync("loadCmsConfig-no-config", async (tempDir) => {
      setupSiteJson(tempDir, { name: "Test Site" });
      expect(await loadCmsConfig(tempDir)).toBeNull();
    }));

  test("returns null for empty site.json", () =>
    withTempDirAsync("loadCmsConfig-empty", async (tempDir) => {
      setupSiteJson(tempDir, {});
      expect(await loadCmsConfig(tempDir)).toBeNull();
    }));

  test("prefers src/_data/site.json over _data/site.json", () =>
    withTempDirAsync("loadCmsConfig-src-priority", async (tempDir) => {
      setupSiteJsonWithSrc(
        tempDir,
        { cms_config: { collections: ["pages"], features: {} } },
        { cms_config: { collections: ["news"], features: {} } },
      );

      const config = await loadCmsConfig(tempDir);
      expect(config.collections).toContain("news");
    }));

  test("falls back to _data/site.json when src folder absent", () =>
    withTempDirAsync("loadCmsConfig-fallback", async (tempDir) => {
      setupSiteJson(tempDir, {
        cms_config: { collections: ["guide-pages"], features: {} },
      });

      const config = await loadCmsConfig(tempDir);
      expect(config.collections).toContain("guide-pages");
    }));

  test("throws when no site.json exists in either location", () =>
    withTempDirAsync("loadCmsConfig-missing", async (tempDir) => {
      await expect(loadCmsConfig(tempDir)).rejects.toThrow(
        "site.json not found",
      );
    }));
});

describe("saveCmsConfig", () => {
  test("writes cms_config while preserving existing site data", () =>
    withTempDirAsync("saveCmsConfig-preserve", async (tempDir) => {
      setupSiteJson(tempDir, {
        name: "Test Site",
        url: "https://example.com",
      });

      await saveCmsConfig({ collections: ["pages"], features: {} }, tempDir);

      const saved = JSON.parse(
        readFileSync(`${tempDir}/_data/site.json`, "utf-8"),
      );
      expect(saved.cms_config.collections).toEqual(["pages"]);
      expect(saved.name).toBe("Test Site");
      expect(saved.url).toBe("https://example.com");
    }));

  test("overwrites existing cms_config", () =>
    withTempDirAsync("saveCmsConfig-overwrite", async (tempDir) => {
      setupSiteJson(tempDir, {
        name: "Test Site",
        cms_config: { collections: ["pages"], features: {} },
      });

      const updated = {
        collections: ["pages", "news"],
        features: { faqs: true },
      };
      await saveCmsConfig(updated, tempDir);

      const saved = JSON.parse(
        readFileSync(`${tempDir}/_data/site.json`, "utf-8"),
      );
      expect(saved.cms_config).toEqual(updated);
    }));

  test("formats JSON with tabs and trailing newline", () =>
    withTempDirAsync("saveCmsConfig-format", async (tempDir) => {
      setupSiteJson(tempDir, { name: "Test Site" });

      await saveCmsConfig({ collections: ["pages"] }, tempDir);

      const content = readFileSync(`${tempDir}/_data/site.json`, "utf-8");
      expect(content).toContain("\t");
      expect(content.endsWith("\n")).toBe(true);
    }));

  test("writes to src/_data when it exists", () =>
    withTempDirAsync("saveCmsConfig-src", async (tempDir) => {
      setupSiteJsonWithSrc(
        tempDir,
        { name: "Root Site" },
        { name: "Src Site" },
      );

      await saveCmsConfig({ collections: ["news"] }, tempDir);

      const srcData = JSON.parse(
        readFileSync(`${tempDir}/src/_data/site.json`, "utf-8"),
      );
      expect(srcData.cms_config.collections).toEqual(["news"]);

      const rootData = JSON.parse(
        readFileSync(`${tempDir}/_data/site.json`, "utf-8"),
      );
      expect(rootData.cms_config).toBeUndefined();
    }));
});

describe("createEmptyConfig", () => {
  test("is complete, with only required collections and every feature off", () => {
    const config = createEmptyConfig();

    expect(config.collections).toContain("pages");
    expect(config.collections).toContain("snippets");
    expect(config.hasSrcFolder).toBe(true);
    expect(config.customBlocksCollections).toEqual([]);
    expect(Object.values(config.features).every((v) => v === false)).toBe(true);
    expect(Object.keys(config.features).sort()).toEqual(
      Object.keys(createDefaultConfig().features).sort(),
    );
  });
});
