import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { withTempDirAsync } from "#test/test-utils.js";

const mocks = vi.hoisted(() => ({
  loadCmsConfig: vi.fn(),
  generateCompactYaml: vi.fn(() => "generated yaml"),
  writeCmsArtifacts: vi.fn(),
  mainPromise: undefined,
}));

vi.mock("#scripts/customise-cms/config.js", () => ({
  loadCmsConfig: mocks.loadCmsConfig,
}));

vi.mock("#scripts/customise-cms/writer.js", () => ({
  generateCompactYaml: mocks.generateCompactYaml,
  writeCmsArtifacts: mocks.writeCmsArtifacts,
  runWithErrorHandling: (main) => {
    mocks.mainPromise = main();
  },
}));

const CONFIG = {
  collections: ["pages", "snippets"],
  features: {
    permalinks: false,
    redirects: false,
    faqs: false,
    galleries: false,
    external_navigation_urls: false,
    no_index: false,
  },
  hasSrcFolder: true,
  customBlocksCollections: [],
};

const runGenerator = async () => {
  await import("#scripts/customise-cms/generate-full.js");
  if (!mocks.mainPromise) throw new Error("Generator main did not run");
  return mocks.mainPromise;
};

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  mocks.loadCmsConfig.mockReset();
  mocks.generateCompactYaml.mockClear();
  mocks.writeCmsArtifacts.mockReset();
  mocks.mainPromise = undefined;
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("generate-full", () => {
  test("regenerates both CMS artifacts from the saved configuration", async () => {
    mocks.loadCmsConfig.mockResolvedValue(CONFIG);

    await runGenerator();

    expect(mocks.writeCmsArtifacts).toHaveBeenCalledWith(CONFIG);
  });

  test("keeps the freshness-test override YAML-only", async () =>
    withTempDirAsync("generate-full", async (tempDir) => {
      const outputPath = join(tempDir, "generated.pages.yml");
      vi.stubEnv("PAGES_YML_OUTPUT_PATH", outputPath);
      mocks.loadCmsConfig.mockResolvedValue(CONFIG);

      await runGenerator();

      await expect(readFile(outputPath, "utf8")).resolves.toBe(
        "generated yaml",
      );
      expect(mocks.writeCmsArtifacts).not.toHaveBeenCalled();
    }));

  test("fails when no saved CMS configuration exists", async () => {
    mocks.loadCmsConfig.mockResolvedValue(null);

    await expect(runGenerator()).rejects.toThrow(
      "No saved cms_config found in site.json",
    );
  });
});
