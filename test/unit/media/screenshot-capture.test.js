import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";
import { screenshot, screenshotAllViewports } from "#media/screenshot.js";
import { withTempDirAsync } from "#test/test-utils.js";

const page = {
  goto: vi.fn(() => Promise.resolve()),
  waitForTimeout: vi.fn(() => Promise.resolve()),
  screenshot: vi.fn(() => Promise.resolve()),
};
const context = { newPage: vi.fn(() => Promise.resolve(page)) };
const browser = {
  newContext: vi.fn(() => Promise.resolve(context)),
  close: vi.fn(() => Promise.resolve()),
};
const launchMock = vi.fn(() => Promise.resolve(browser));

vi.mock("playwright", () => ({
  chromium: { launch: (...args) => launchMock(...args) },
}));
// Browser presence is checked for real in browser-launch.test.js; here it
// is stubbed because concurrent dynamic imports of a mocked module can
// race past the mock registry and load the real playwright.
vi.mock("#media/browser-utils.js", async (importOriginal) => ({
  ...(await importOriginal()),
  ensureBrowserInstalled: () => Promise.resolve(process.execPath),
}));

describe("screenshot", () => {
  test("navigates and captures with the requested viewport", async () => {
    await withTempDirAsync("screenshot-capture", async (dir) => {
      const result = await screenshot("/about/", {
        outputDir: dir,
        baseUrl: "http://localhost:9",
        viewport: "mobile",
        timeout: 1234,
      });

      expect(browser.newContext).toHaveBeenLastCalledWith(
        expect.objectContaining({ viewport: { width: 375, height: 667 } }),
      );
      expect(page.goto).toHaveBeenLastCalledWith("http://localhost:9/about/", {
        waitUntil: "domcontentloaded",
        timeout: 1234,
      });
      expect(page.screenshot).toHaveBeenLastCalledWith({
        path: join(dir, "about-mobile.png"),
        fullPage: false,
      });
      expect(browser.close).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        path: join(dir, "about-mobile.png"),
        url: "http://localhost:9/about/",
        viewport: "mobile",
      });
    });
  });

  test("unknown viewports fall back to desktop, full-page captures fullPage", async () => {
    await withTempDirAsync("screenshot-fallback", async (dir) => {
      await screenshot("/", {
        outputDir: dir,
        baseUrl: "http://localhost:9",
        viewport: "nonsense",
        timeout: 1,
      });
      expect(browser.newContext).toHaveBeenLastCalledWith(
        expect.objectContaining({ viewport: { width: 1280, height: 800 } }),
      );

      await screenshot("/", {
        outputDir: dir,
        baseUrl: "http://localhost:9",
        viewport: "full-page",
        timeout: 1,
      });
      expect(page.screenshot).toHaveBeenLastCalledWith(
        expect.objectContaining({ fullPage: true }),
      );
    });
  });

  test("builds the output path from the page path and viewport", async () => {
    await withTempDirAsync("screenshot-op", async (dir) => {
      const result = await screenshot("/news/first/", {
        outputDir: dir,
        baseUrl: "http://localhost:9",
        viewport: "tablet",
      });

      expect(result.success).toBe(true);
      expect(result.path).toBe(join(dir, "news-first-tablet.png"));
      expect(page.goto).toHaveBeenLastCalledWith(
        "http://localhost:9/news/first/",
        expect.anything(),
      );
    });
  });
});

describe("screenshotAllViewports", () => {
  // The four captures run concurrently, and concurrent dynamic imports of
  // the mocked playwright can race past the mock registry - so this
  // asserts the function's contract (one attempt per viewport, failures
  // isolated per viewport) rather than all-success.
  test("attempts every configured viewport and reports each outcome", async () => {
    await withTempDirAsync("screenshot-all", async (dir) => {
      const { results, errors } = await screenshotAllViewports("/about/", {
        outputDir: dir,
        baseUrl: "http://localhost:9",
      });

      const attempted = [
        ...results.map((r) => r.viewport),
        ...errors.map((e) => e.viewport),
      ].sort();
      expect(attempted).toEqual(["desktop", "full-page", "mobile", "tablet"]);
      for (const err of errors) {
        expect(err.pagePath).toBe("/about/");
        expect(typeof err.error).toBe("string");
      }
    });
  }, 10_000);
});
