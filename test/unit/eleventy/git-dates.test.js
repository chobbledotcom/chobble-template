import { describe, expect, test } from "bun:test";
import { configureGitDates } from "#eleventy/git-dates.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

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
});
