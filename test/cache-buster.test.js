import { configureCacheBuster } from "#eleventy/cache-buster.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectFunctionType,
  expectStrictEqual,
  expectTrue,
} from "./test-utils.js";

const testCases = [
  {
    name: "configureCacheBuster-registers-filter",
    description: "Registers cacheBust filter with Eleventy config",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureCacheBuster(mockConfig);

      expectFunctionType(
        mockConfig.filters,
        "cacheBust",
        "Should register cacheBust filter",
      );
    },
  },
  {
    name: "cacheBust-development-mode",
    description: "Returns URL unchanged in development mode",
    test: () => {
      const originalRunMode = process.env.ELEVENTY_RUN_MODE;
      process.env.ELEVENTY_RUN_MODE = "serve";

      const mockConfig = createMockEleventyConfig();
      configureCacheBuster(mockConfig);

      const result = mockConfig.filters.cacheBust("/styles.css");
      expectStrictEqual(
        result,
        "/styles.css",
        "Should return URL unchanged in development mode",
      );

      process.env.ELEVENTY_RUN_MODE = originalRunMode;
    },
  },
  {
    name: "cacheBust-development-undefined",
    description: "Returns URL unchanged when ELEVENTY_RUN_MODE is undefined",
    test: () => {
      const originalRunMode = process.env.ELEVENTY_RUN_MODE;
      delete process.env.ELEVENTY_RUN_MODE;

      const mockConfig = createMockEleventyConfig();
      configureCacheBuster(mockConfig);

      const result = mockConfig.filters.cacheBust("/script.js");
      expectStrictEqual(
        result,
        "/script.js",
        "Should return URL unchanged when run mode is undefined",
      );

      process.env.ELEVENTY_RUN_MODE = originalRunMode;
    },
  },
  {
    name: "cacheBust-production-mode",
    description: "Adds cache busting parameter in production mode",
    test: () => {
      const originalRunMode = process.env.ELEVENTY_RUN_MODE;
      process.env.ELEVENTY_RUN_MODE = "build";

      const mockConfig = createMockEleventyConfig();
      configureCacheBuster(mockConfig);

      const result = mockConfig.filters.cacheBust("/styles.css");
      expectTrue(
        result.startsWith("/styles.css?cached="),
        "Should add cached parameter in production mode",
      );

      process.env.ELEVENTY_RUN_MODE = originalRunMode;
    },
  },
  {
    name: "cacheBust-production-timestamp-format",
    description: "Cache buster uses numeric timestamp",
    test: () => {
      const originalRunMode = process.env.ELEVENTY_RUN_MODE;
      process.env.ELEVENTY_RUN_MODE = "build";

      const mockConfig = createMockEleventyConfig();
      configureCacheBuster(mockConfig);

      const result = mockConfig.filters.cacheBust("/app.js");
      const match = result.match(/\?cached=(\d+)$/);
      expectTrue(match !== null, "Should have numeric timestamp");
      expectTrue(
        parseInt(match[1]) > 0,
        "Timestamp should be a positive number",
      );

      process.env.ELEVENTY_RUN_MODE = originalRunMode;
    },
  },
  {
    name: "cacheBust-production-consistent-timestamp",
    description: "Cache buster uses consistent timestamp across calls",
    test: () => {
      const originalRunMode = process.env.ELEVENTY_RUN_MODE;
      process.env.ELEVENTY_RUN_MODE = "build";

      const mockConfig = createMockEleventyConfig();
      configureCacheBuster(mockConfig);

      const result1 = mockConfig.filters.cacheBust("/styles.css");
      const result2 = mockConfig.filters.cacheBust("/script.js");

      const timestamp1 = result1.match(/\?cached=(\d+)$/)[1];
      const timestamp2 = result2.match(/\?cached=(\d+)$/)[1];

      expectStrictEqual(
        timestamp1,
        timestamp2,
        "Timestamp should be consistent across calls",
      );

      process.env.ELEVENTY_RUN_MODE = originalRunMode;
    },
  },
  {
    name: "cacheBust-production-various-urls",
    description: "Works with various URL formats in production",
    test: () => {
      const originalRunMode = process.env.ELEVENTY_RUN_MODE;
      process.env.ELEVENTY_RUN_MODE = "build";

      const mockConfig = createMockEleventyConfig();
      configureCacheBuster(mockConfig);

      const urls = [
        "/css/main.css",
        "/js/bundle.js",
        "/assets/images/logo.png",
        "/deep/nested/path/file.woff2",
      ];

      for (const url of urls) {
        const result = mockConfig.filters.cacheBust(url);
        expectTrue(
          result.startsWith(url + "?cached="),
          `Should add cache busting to ${url}`,
        );
      }

      process.env.ELEVENTY_RUN_MODE = originalRunMode;
    },
  },
];

export default createTestRunner("cache-buster", testCases);
