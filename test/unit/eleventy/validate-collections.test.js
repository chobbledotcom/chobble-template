import { describe, expect, test } from "bun:test";
import { configureCollectionValidation } from "#eleventy/validate-collections.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("configureCollectionValidation", () => {
  test("registers an eleventy.before event handler", () => {
    const mockConfig = createMockEleventyConfig();
    configureCollectionValidation(mockConfig);

    expect(mockConfig.eventHandlers["eleventy.before"]).toBeDefined();
  });
});
