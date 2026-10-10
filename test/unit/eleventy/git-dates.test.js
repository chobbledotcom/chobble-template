import { describe, expect, test } from "bun:test";
import { configureGitDates } from "#eleventy/git-dates.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

const TRACKED_TEMPLATE = "src/utils/sitemap.html";

describe("git date filters", () => {
  test("registers build refresh and public filters", () => {
    const config = createMockEleventyConfig();
    configureGitDates(config);

    expect(typeof config.eventHandlers["eleventy.before"]).toBe("function");
    expect(typeof config.filters.gitDates).toBe("function");
    expect(typeof config.filters.gitUpdated).toBe("function");
    expect(typeof config.filters.humanDate).toBe("function");
    expect(typeof config.filters.isoDate).toBe("function");
  });

  test("rebuilds the date index per build and resolves template dates", () => {
    const config = createMockEleventyConfig();
    configureGitDates(config);

    config.eventHandlers["eleventy.before"]();

    const dates = config.filters.gitDates(TRACKED_TEMPLATE);
    expect(dates.published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(dates.updated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(config.filters.gitDates("./no-such-file.md")).toBeNull();
    expect(config.filters.gitUpdated(TRACKED_TEMPLATE)).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    );
    expect(config.filters.gitUpdated(null)).toBeNull();
  });

  test("formats dates through the registered filters", () => {
    const config = createMockEleventyConfig();
    configureGitDates(config);

    expect(config.filters.humanDate("2025-01-06T12:00:00Z")).toBe(
      "6 January 2025",
    );
    expect(config.filters.isoDate("2025-01-06T12:00:00Z")).toBe("2025-01-06");
    expect(config.filters.humanDate(null)).toBe("");
    expect(config.filters.isoDate(undefined)).toBe("");
  });
});
