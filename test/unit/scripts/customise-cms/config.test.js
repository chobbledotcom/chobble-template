import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { getRequiredCollections } from "#scripts/customise-cms/collections.js";
import {
  createDefaultConfig,
  loadCmsConfig,
  saveCmsConfig,
} from "#scripts/customise-cms/config.js";
import { withMockedCwdAsync } from "#test/test-utils.js";

/**
 * Set up a test directory with _data folder and site.json file
 * @param {string} tempDir
 * @param {Object} siteData
 */
const setupSiteJson = async (tempDir, siteData) => {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(`${tempDir}/_data`, { recursive: true });
  writeFileSync(`${tempDir}/_data/site.json`, JSON.stringify(siteData));
};

/**
 * Set up test directories with both _data and src/_data
 * @param {string} tempDir
 * @param {Object} rootData
 * @param {Object} srcData
 */
const setupSiteJsonWithSrc = async (tempDir, rootData, srcData) => {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(`${tempDir}/_data`, { recursive: true });
  mkdirSync(`${tempDir}/src/_data`, { recursive: true });
  writeFileSync(`${tempDir}/_data/site.json`, JSON.stringify(rootData));
  writeFileSync(`${tempDir}/src/_data/site.json`, JSON.stringify(srcData));
};

describe("createDefaultConfig", () => {
  const config = createDefaultConfig();

  test("includes all non-internal collections", () => {
    expect(config.collections).toContain("pages");
    expect(config.collections).toContain("products");
    expect(config.collections).toContain("news");
    expect(config.collections).toContain("snippets");
    expect(config.collections.length).toBeGreaterThan(10);
  });

  test("enables most features but not visual editor or blocks", () => {
    expect(config.features.faqs).toBe(true);
    expect(config.features.galleries).toBe(true);
    expect(config.features.permalinks).toBe(true);
    expect(config.features.use_visual_editor).toBe(false);
    expect(config.features.use_blocks).toBe(false);
  });

  test("defaults to src folder and no custom home page", () => {
    expect(config.hasSrcFolder).toBe(true);
    expect(config.customHomePage).toBe(false);
  });
});

describe("loadCmsConfig", () => {
  const { withTempDirAsync } = require("#test/test-utils.js");

  const expectCmsConfigNull = (tempDir) =>
    withMockedCwdAsync(tempDir, async () => {
      expect(await loadCmsConfig()).toBeNull();
    });

  const withLoadedConfig = (tempDir, fn) =>
    withMockedCwdAsync(tempDir, async () => fn(await loadCmsConfig()));

  test("reads cms_config from site.json", () =>
    withTempDirAsync("loadCmsConfig", async (tempDir) => {
      await setupSiteJson(tempDir, {
        name: "Test Site",
        cms_config: {
          collections: ["pages", "products"],
          features: { permalinks: true },
        },
      });

      return withLoadedConfig(tempDir, (config) => {
        expect(config.collections).toContain("pages");
        expect(config.collections).toContain("products");
        expect(config.features.permalinks).toBe(true);
      });
    }));

  test("merges required collections into loaded config", () =>
    withTempDirAsync("loadCmsConfig-required", async (tempDir) => {
      await setupSiteJson(tempDir, {
        name: "Test Site",
        cms_config: {
          collections: ["products"],
          features: {},
        },
      });

      return withLoadedConfig(tempDir, (config) => {
        const requiredNames = getRequiredCollections().map((c) => c.name);

        for (const name of requiredNames) {
          expect(config.collections).toContain(name);
        }
      });
    }));

  test("returns null when cms_config is absent", () =>
    withTempDirAsync("loadCmsConfig-no-config", async (tempDir) => {
      await setupSiteJson(tempDir, { name: "Test Site" });
      return expectCmsConfigNull(tempDir);
    }));

  test("returns null for empty site.json", () =>
    withTempDirAsync("loadCmsConfig-empty", async (tempDir) => {
      await setupSiteJson(tempDir, {});
      return expectCmsConfigNull(tempDir);
    }));

  test("prefers src/_data/site.json over _data/site.json", () =>
    withTempDirAsync("loadCmsConfig-src-priority", async (tempDir) => {
      await setupSiteJsonWithSrc(
        tempDir,
        { cms_config: { collections: ["pages"], features: {} } },
        { cms_config: { collections: ["products"], features: {} } },
      );

      return withLoadedConfig(tempDir, (config) => {
        expect(config.collections).toContain("products");
      });
    }));

  test("falls back to _data/site.json when src folder absent", () =>
    withTempDirAsync("loadCmsConfig-fallback", async (tempDir) => {
      await setupSiteJson(tempDir, {
        cms_config: { collections: ["events"], features: {} },
      });

      return withLoadedConfig(tempDir, (config) => {
        expect(config.collections).toContain("events");
      });
    }));
});

describe("saveCmsConfig", () => {
  const { withTempDirAsync } = require("#test/test-utils.js");

  test("writes cms_config while preserving existing site data", () =>
    withTempDirAsync("saveCmsConfig-preserve", async (tempDir) => {
      await setupSiteJson(tempDir, {
        name: "Test Site",
        url: "https://example.com",
      });

      return withMockedCwdAsync(tempDir, async () => {
        await saveCmsConfig({ collections: ["pages"], features: {} });

        const saved = JSON.parse(
          readFileSync(`${tempDir}/_data/site.json`, "utf-8"),
        );

        expect(saved.cms_config.collections).toEqual(["pages"]);
        expect(saved.name).toBe("Test Site");
        expect(saved.url).toBe("https://example.com");
      });
    }));

  test("overwrites existing cms_config", () =>
    withTempDirAsync("saveCmsConfig-overwrite", async (tempDir) => {
      await setupSiteJson(tempDir, {
        name: "Test Site",
        cms_config: { collections: ["pages"], features: {} },
      });

      return withMockedCwdAsync(tempDir, async () => {
        const updated = {
          collections: ["pages", "products", "news"],
          features: { faqs: true },
        };
        await saveCmsConfig(updated);

        const saved = JSON.parse(
          readFileSync(`${tempDir}/_data/site.json`, "utf-8"),
        );

        expect(saved.cms_config).toEqual(updated);
      });
    }));

  test("formats JSON with tabs and trailing newline", () =>
    withTempDirAsync("saveCmsConfig-format", async (tempDir) => {
      await setupSiteJson(tempDir, { name: "Test Site" });

      return withMockedCwdAsync(tempDir, async () => {
        await saveCmsConfig({ collections: ["pages"] });

        const content = readFileSync(`${tempDir}/_data/site.json`, "utf-8");

        expect(content).toContain("\t");
        expect(content.endsWith("\n")).toBe(true);
      });
    }));

  test("writes to src/_data when it exists", () =>
    withTempDirAsync("saveCmsConfig-src", async (tempDir) => {
      await setupSiteJsonWithSrc(
        tempDir,
        { name: "Root Site" },
        { name: "Src Site" },
      );

      return withMockedCwdAsync(tempDir, async () => {
        await saveCmsConfig({ collections: ["products"] });

        const srcData = JSON.parse(
          readFileSync(`${tempDir}/src/_data/site.json`, "utf-8"),
        );
        expect(srcData.cms_config.collections).toEqual(["products"]);

        const rootData = JSON.parse(
          readFileSync(`${tempDir}/_data/site.json`, "utf-8"),
        );
        expect(rootData.cms_config).toBeUndefined();
      });
    }));
});
