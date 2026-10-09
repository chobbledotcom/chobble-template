import { describe, expect, test } from "vitest";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("createMockEleventyConfig", () => {
  test("resolvePlugin returns a callable no-op stub", () => {
    const mockConfig = createMockEleventyConfig();
    const plugin = mockConfig.resolvePlugin("@11ty/some-plugin");

    expect(typeof plugin).toBe("function");
    expect(plugin()).toBeUndefined();
  });
});
