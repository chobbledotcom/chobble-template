import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";
import { ROOT_DIR } from "#lib/paths.js";
import {
  buildUrl,
  createBatchRunner,
  createPathContext,
  getChromePath,
  getDefaultOutputDir,
  prepareOutputDir,
} from "#media/browser-utils.js";
import { withTempDir } from "#test/test-utils.js";

describe("browser-utils path helpers", () => {
  test("prepareOutputDir creates the parent directory for a file", () => {
    withTempDir("browser-utils-prepare", (dir) => {
      const outputPath = join(dir, "nested/deeper/shot.png");

      prepareOutputDir(outputPath);

      expect(existsSync(join(dir, "nested/deeper"))).toBe(true);
    });
  });

  test("buildUrl joins page paths onto the base url", () => {
    expect(buildUrl("/about/", "http://localhost:9")).toBe(
      "http://localhost:9/about/",
    );
    expect(buildUrl("about/", "http://localhost:9")).toBe(
      "http://localhost:9/about/",
    );
    expect(buildUrl("https://example.com/x", "http://localhost:9")).toBe(
      "https://example.com/x",
    );
  });

  test("sanitizes the page path into a hyphenated filename", () => {
    const { outputPath } = createPathContext(
      "/news/first/",
      { outputDir: "/out", baseUrl: "http://localhost:9", outputPath: null },
      {},
      { suffix: "-mobile", extension: "png" },
    );

    expect(outputPath).toBe("/out/news-first-mobile.png");
  });

  test("path config resolves static and computed suffix parts", () => {
    const { outputPath } = createPathContext(
      "/a/",
      { outputDir: "/out", baseUrl: "http://localhost:9", outputPath: null },
      { viewport: "tablet" },
      {
        suffix: (opts) => `-${opts.viewport}`,
        extension: "png",
      },
    );

    expect(outputPath).toBe("/out/a-tablet.png");
  });

  test("getDefaultOutputDir resolves under the repo root", () => {
    expect(getDefaultOutputDir("screenshots")).toBe(
      join(ROOT_DIR, "screenshots"),
    );
  });
});

describe("createPathContext", () => {
  const defaults = {
    outputDir: "/out",
    baseUrl: "http://localhost:9",
    outputPath: null,
  };

  test("merges options and builds url and output path", () => {
    const context = createPathContext(
      "/contact/",
      defaults,
      { outputDir: "/custom" },
      { suffix: "", extension: "png" },
    );

    expect(context.opts.outputDir).toBe("/custom");
    expect(context.url).toBe("http://localhost:9/contact/");
    expect(context.outputPath).toBe("/custom/contact.png");
  });

  test("an explicit outputPath wins over the builder", () => {
    const context = createPathContext(
      "/contact/",
      defaults,
      { outputPath: "/exact/here.png" },
      { extension: "png" },
    );

    expect(context.outputPath).toBe("/exact/here.png");
  });

  test("builds paths from a path config", () => {
    const context = createPathContext(
      "/a/b/",
      defaults,
      {},
      {
        suffix: "-x",
        extension: "webp",
      },
    );

    expect(context.outputPath).toBe("/out/a-b-x.webp");
  });
});

describe("batch operations", () => {
  test("collects results and maps rejections to error info", async () => {
    const runBatch = createBatchRunner((path) =>
      path === "/ok/"
        ? Promise.resolve({ path })
        : Promise.reject(new Error("boom")),
    );

    const { results, errors } = await runBatch(["/ok/", "/bad/"]);

    expect(results).toEqual([{ path: "/ok/" }]);
    expect(errors).toEqual([{ pagePath: "/bad/", error: "boom" }]);
  });

  test("createBatchRunner passes shared options to every operation", async () => {
    const operation = vi.fn((path, options) =>
      Promise.resolve(`${path}@${options.viewport}`),
    );
    const runBatch = createBatchRunner(operation);

    const { results, errors } = await runBatch(["/a/", "/b/"], {
      viewport: "mobile",
    });

    expect(results).toEqual(["/a/@mobile", "/b/@mobile"]);
    expect(errors).toEqual([]);
  });
});

describe("startServer", () => {
  // The real Eleventy Dev Server keeps handles open that stall vitest's
  // worker teardown, so the module is mocked here; serving real files is
  // exercised by the lighthouse/screenshot CLI paths.
  const mockDevServer = async (fetchImpl) => {
    const serve = vi.fn();
    const close = vi.fn(() => Promise.resolve());
    const getServer = vi.fn(() => ({ serve, close }));
    vi.doMock("@11ty/eleventy-dev-server", () => ({
      default: { getServer },
    }));
    vi.stubGlobal("fetch", vi.fn(fetchImpl));
    vi.resetModules();
    const utils = await import("#media/browser-utils.js");
    return { close, getServer, serve, utils };
  };

  const unmockDevServer = () => {
    vi.unstubAllGlobals();
    vi.doUnmock("@11ty/eleventy-dev-server");
    vi.resetModules();
  };

  test("boots the dev server, waits for it, and exposes stop", async () => {
    const { close, getServer, serve, utils } = await mockDevServer(() =>
      Promise.resolve({ ok: true, status: 200 }),
    );

    try {
      const server = await utils.startServer("/tmp/site-dir", 8471);

      expect(getServer).toHaveBeenCalledWith(
        "cfa-static-tools",
        "/tmp/site-dir",
        expect.objectContaining({ liveReload: false }),
      );
      expect(serve).toHaveBeenCalledWith(8471);
      expect(server.baseUrl).toBe("http://localhost:8471");

      await server.stop();
      expect(close).toHaveBeenCalled();
    } finally {
      unmockDevServer();
    }
  });

  test("fails cleanly when the server never comes up", async () => {
    const { utils } = await mockDevServer(() =>
      Promise.reject(new Error("connection refused")),
    );
    vi.useFakeTimers();

    try {
      const promise = utils.startServer("/tmp/site-dir", 8472);
      const expectation = expect(promise).rejects.toThrow(
        "did not respond after 30 attempts",
      );
      for (let i = 0; i < 30; i++) {
        await vi.advanceTimersByTimeAsync(250);
      }

      await expectation;
    } finally {
      vi.useRealTimers();
      unmockDevServer();
    }
  });
});

describe("getChromePath", () => {
  test("prefers the CHROME_PATH environment variable", async () => {
    vi.stubEnv("CHROME_PATH", "/custom/chrome");

    expect(await getChromePath()).toBe("/custom/chrome");
    vi.unstubAllEnvs();
  });

  test("falls back to playwright's chromium executable", async () => {
    vi.stubEnv("CHROME_PATH", "");

    const path = await getChromePath();

    expect(typeof path).toBe("string");
    expect(path.length).toBeGreaterThan(0);
    vi.unstubAllEnvs();
  }, 15_000);
});
