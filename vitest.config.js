import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { COVERAGE_IGNORE } from "./test/coverage-ignore.js";

const NO_NAV = {
  disableMainFrameNavigation: true,
  disableChildFrameNavigation: true,
  disableChildPageNavigation: true,
};

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE_DATA_DIR = join(ROOT, "src", "_data");
const SITE_DATA_FIXTURES = join(ROOT, "test", "fixtures", "site-data");

/**
 * Tests exercise the template, not the site built from it. A fork rewrites
 * its src/_data/*.json (name, toggles, languages, translations), and the
 * template's tests travel with it, so every import of a site-owned data file
 * resolves to the template-default copy in test/fixtures/site-data/. The test
 * site factory overlays the same fixtures onto the sites it builds.
 */
const siteDataFixtures = {
  name: "site-data-fixtures",
  enforce: "pre",
  async resolveId(source, importer, options) {
    if (!source.endsWith(".json")) return null;
    const resolved = await this.resolve(source, importer, {
      ...options,
      skipSelf: true,
    });
    if (!resolved || dirname(resolved.id) !== SITE_DATA_DIR) return null;
    const fixture = join(SITE_DATA_FIXTURES, basename(resolved.id));
    return existsSync(fixture) ? fixture : null;
  },
};

export default defineConfig({
  plugins: [siteDataFixtures],
  resolve: {
    alias: {
      // uwrap publishes only a "module" entry; vite's SSR resolution wants
      // "main"/"exports", so point straight at the file.
      uwrap: fileURLToPath(
        new URL("./node_modules/uwrap/dist/uWrap.mjs", import.meta.url),
      ),
    },
  },
  test: {
    include: ["test/**/*.test.js"],
    // Integration tests spawn child Eleventy builds; unbounded worker
    // parallelism stacks those on top of vitest's own processes and starves
    // file handles under load. Half the cores keeps runs deterministic.
    maxWorkers: "50%",
    environment: "happy-dom",
    environmentOptions: {
      happyDOM: {
        settings: {
          disableCSSFileLoading: true,
          disableJavaScriptFileLoading: true,
          disableJavaScriptEvaluation: true,
          disableIframePageLoading: true,
          disableComputedStyleRendering: true,
          navigation: NO_NAV,
        },
      },
    },
    setupFiles: ["./test/ensure-deps.js"],
    globalSetup: ["./test/global-teardown.js"],
    testTimeout: 1500,
    coverage: {
      // Istanbul instruments the transformed source, so hit counts merge
      // exactly across workers. The v8 provider keys function tables to
      // each worker's vite transform variant, and the merged report showed
      // phantom misses for functions the tests demonstrably execute.
      provider: "istanbul",
      // Report only files the tests actually load
      // (all: false), and require full line/function coverage of them.
      all: false,
      reporter: ["lcov", "text-summary"],
      reportsDirectory: "./coverage",
      exclude: ["**/node_modules/**", ...COVERAGE_IGNORE],
      thresholds: { lines: 100, functions: 100 },
    },
  },
});
