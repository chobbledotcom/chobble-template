import { describe, expect, test } from "bun:test";
import { cacheBust } from "#eleventy/cache-buster.js";

describe("cache-buster", () => {
  test("Returns URL unchanged in development mode", () => {
    const originalRunMode = process.env.ELEVENTY_RUN_MODE;
    process.env.ELEVENTY_RUN_MODE = "serve";

    const result = cacheBust("/styles.css");
    expect(result).toBe("/styles.css");

    process.env.ELEVENTY_RUN_MODE = originalRunMode;
  });

  test("Returns URL unchanged when ELEVENTY_RUN_MODE is undefined", () => {
    const originalRunMode = process.env.ELEVENTY_RUN_MODE;
    delete process.env.ELEVENTY_RUN_MODE;

    const result = cacheBust("/script.js");
    expect(result).toBe("/script.js");

    process.env.ELEVENTY_RUN_MODE = originalRunMode;
  });

  test("Adds cache busting parameter in production mode", () => {
    const originalRunMode = process.env.ELEVENTY_RUN_MODE;
    process.env.ELEVENTY_RUN_MODE = "build";

    const result = cacheBust("/styles.css");
    expect(result.startsWith("/styles.css?cached=")).toBe(true);

    process.env.ELEVENTY_RUN_MODE = originalRunMode;
  });

  test("Cache buster uses numeric timestamp", () => {
    const originalRunMode = process.env.ELEVENTY_RUN_MODE;
    process.env.ELEVENTY_RUN_MODE = "build";

    const result = cacheBust("/app.js");
    const match = result.match(/\?cached=(\d+)$/);
    expect(match !== null).toBe(true);
    expect(parseInt(match[1], 10) > 0).toBe(true);

    process.env.ELEVENTY_RUN_MODE = originalRunMode;
  });

  test("Cache buster uses consistent timestamp across calls", () => {
    const originalRunMode = process.env.ELEVENTY_RUN_MODE;
    process.env.ELEVENTY_RUN_MODE = "build";

    const result1 = cacheBust("/styles.css");
    const result2 = cacheBust("/script.js");

    const timestamp1 = result1.match(/\?cached=(\d+)$/)[1];
    const timestamp2 = result2.match(/\?cached=(\d+)$/)[1];

    expect(timestamp1).toBe(timestamp2);

    process.env.ELEVENTY_RUN_MODE = originalRunMode;
  });

  test("Works with various URL formats in production", () => {
    const originalRunMode = process.env.ELEVENTY_RUN_MODE;
    process.env.ELEVENTY_RUN_MODE = "build";

    const urls = [
      "/css/main.css",
      "/js/bundle.js",
      "/assets/images/logo.png",
      "/deep/nested/path/file.woff2",
    ];

    for (const url of urls) {
      const result = cacheBust(url);
      expect(result.startsWith(`${url}?cached=`)).toBe(true);
    }

    process.env.ELEVENTY_RUN_MODE = originalRunMode;
  });
});
