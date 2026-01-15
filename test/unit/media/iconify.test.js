import { describe, expect, test } from "bun:test";
import { configureIconify } from "#media/iconify.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("iconify", () => {
  describe("configureIconify", () => {
    test("Registers icon as an async filter", () => {
      const mockConfig = createMockEleventyConfig();
      configureIconify(mockConfig);
      expect(typeof mockConfig.asyncFilters.icon).toBe("function");
    });

    test("Registered filter throws for invalid icon identifier", async () => {
      const mockConfig = createMockEleventyConfig();
      configureIconify(mockConfig);

      await expect(mockConfig.asyncFilters.icon("invalid")).rejects.toThrow(
        /Invalid icon identifier/,
      );
    });

    test("Registered filter throws for empty prefix", async () => {
      const mockConfig = createMockEleventyConfig();
      configureIconify(mockConfig);

      await expect(mockConfig.asyncFilters.icon(":name")).rejects.toThrow(
        /Invalid icon identifier/,
      );
    });

    test("Registered filter throws for empty name", async () => {
      const mockConfig = createMockEleventyConfig();
      configureIconify(mockConfig);

      await expect(mockConfig.asyncFilters.icon("prefix:")).rejects.toThrow(
        /Invalid icon identifier/,
      );
    });

    test("Registered filter throws for non-string input", async () => {
      const mockConfig = createMockEleventyConfig();
      configureIconify(mockConfig);

      await expect(mockConfig.asyncFilters.icon(123)).rejects.toThrow(
        /Invalid icon identifier/,
      );
      await expect(mockConfig.asyncFilters.icon(null)).rejects.toThrow(
        /Invalid icon identifier/,
      );
    });

    // Network-dependent tests are skipped in unit tests
    // The happy-dom test environment simulates a browser which has CORS restrictions
    // The actual filter runs server-side during build where CORS doesn't apply
    // Integration testing is done via `bun run build` with actual icon usage
  });
});
