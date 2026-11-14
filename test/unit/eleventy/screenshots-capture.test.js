import { join } from "node:path";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  buildCollectionHandler,
  configureScreenshots,
} from "#eleventy/screenshots.js";
import { createMockEleventyConfig, rootDir } from "#test/test-utils.js";

const getConfigMock = vi.fn();
const startServerMock = vi.fn();
const screenshotMultipleMock = vi.fn();

vi.mock("#data/config.js", () => ({
  default: (...args) => getConfigMock(...args),
}));
vi.mock("#media/browser-utils.js", async (importOriginal) => ({
  ...(await importOriginal()),
  startServer: (...args) => startServerMock(...args),
}));
vi.mock("#media/screenshot.js", async (importOriginal) => ({
  ...(await importOriginal()),
  screenshotMultiple: (...args) => screenshotMultipleMock(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const ITEMS = [
  { url: "/one/" },
  { data: { page: { url: "/two/" } } },
  { untracked: true },
];

/** Run the collection handler with the given screenshots config, return urls */
const collectUrls = (screenshots) => {
  const collectionApi = {
    getFilteredByTag: vi.fn(() => ITEMS),
    getAll: vi.fn(() => ITEMS),
  };
  getConfigMock.mockReturnValue({ screenshots });
  const ref = { urls: [] };
  const registered = buildCollectionHandler(ref)(collectionApi);
  expect(registered).toEqual([]);
  return ref.urls;
};

describe("buildCollectionHandler", () => {
  test("collects page urls from configured collections", () => {
    expect(collectUrls({ collections: ["pages"] })).toEqual(["/one/", "/two/"]);
  });

  test("uses an explicit pages list when configured", () => {
    expect(collectUrls({ pages: ["/only-this/"] })).toEqual(["/only-this/"]);
  });

  test("falls back to every page in the site", () => {
    expect(collectUrls({})).toEqual(["/one/", "/two/"]);
  });
});

describe("capture pipeline via eleventy.after", () => {
  test("serves the output dir, captures pages, and stops the server", async () => {
    const server = armCapture([{ path: "one.png" }]);

    await runAfterHandler({
      enabled: true,
      autoCapture: true,
      port: 8123,
      limit: 2,
      outputDir: "/absolute/shots",
      collections: ["pages"],
    });

    expect(startServerMock).toHaveBeenCalledWith("_site", 8123);
    expect(screenshotMultipleMock).toHaveBeenCalledWith(
      ["/one/", "/two/"],
      expect.objectContaining({
        baseUrl: "http://localhost:8123",
        outputDir: "/absolute/shots",
      }),
    );
    expect(server.stop).toHaveBeenCalled();
  });

  test("resolves a relative output dir against the working directory", async () => {
    armCapture();

    await runAfterHandler({
      enabled: true,
      autoCapture: true,
      pages: ["/one/"],
    });

    expect(startServerMock).toHaveBeenCalledWith("_site", 8080);
    const options = screenshotMultipleMock.mock.calls.at(-1)[1];
    expect(options.outputDir).toBe(join(rootDir, "screenshots"));
  });

  test("stays silent about errors when every capture succeeds", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    armCapture([{ path: "ok.png" }]);

    await runAfterHandler({
      enabled: true,
      autoCapture: true,
      pages: ["/one/"],
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("reports each failed page", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    armCapture([], [{ pagePath: "/a/", error: "boom" }]);

    await runAfterHandler({
      enabled: true,
      autoCapture: true,
      pages: ["/a/"],
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Screenshot errors: 1"),
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("/a/"));
    errorSpy.mockRestore();
  });
});

/**
 * Configure the plugin with the given screenshots config, populate the
 * screenshot collection, and fire the eleventy.after callback.
 */
const runAfterHandler = async (screenshots) => {
  getConfigMock.mockReturnValue({ screenshots });
  const mockConfig = createMockEleventyConfig();
  configureScreenshots(mockConfig);
  const collectionApi = {
    getFilteredByTag: vi.fn(() => ITEMS),
    getAll: vi.fn(() => ITEMS),
  };
  mockConfig.collections._screenshotPages(collectionApi);
  const afterHandler = mockConfig.eventHandlers["eleventy.after"];
  await afterHandler({ dir: { output: "_site" } });
  return mockConfig;
};

/** Point the mocked server + capture pipeline at canned results */
const armCapture = (results = [], errors = []) => {
  const server = { baseUrl: "http://localhost:8123", stop: vi.fn() };
  startServerMock.mockResolvedValue(server);
  screenshotMultipleMock.mockResolvedValue({ results, errors });
  return server;
};

describe("configureScreenshots capture wiring", () => {
  test("eleventy.after skips capture when disabled", async () => {
    await runAfterHandler({ enabled: false });

    expect(startServerMock).not.toHaveBeenCalled();
  });

  test("eleventy.after captures when enabled with autoCapture", async () => {
    const server = armCapture();

    await runAfterHandler({ enabled: true, autoCapture: true });

    expect(startServerMock).toHaveBeenCalledWith("_site", 8080);
    expect(server.stop).toHaveBeenCalled();
  });
});
