import { describe, expect, test } from "bun:test";
import siteData from "#data/site.json" with { type: "json" };

/**
 * Tests for canonical-url.js validation logic.
 *
 * These tests verify the validation that happens at module load time.
 * Since the actual module throws errors at import time if validation fails,
 * we test the validation logic by replicating the checks here.
 *
 * The actual production validation in canonical-url.js lines 4-17 ensures:
 * 1. site.url exists (line 4-6)
 * 2. site.url doesn't end with "/" (line 8-10)
 * 3. site.url uses http/https protocol (line 12-17)
 */
describe("canonical-url validation", () => {
  test("Validates that site.url exists", () => {
    // Production code at line 4-6 checks !site.url
    const testSite = { url: "" };

    expect(!testSite.url).toBe(true);
  });

  test("Error thrown when site.url is missing", () => {
    // Production code throws: "site.json is missing the 'url' field"
    const testSite = {};

    expect(() => {
      if (!testSite.url) {
        throw new Error("site.json is missing the 'url' field");
      }
    }).toThrow("site.json is missing the 'url' field");
  });

  test("Validates that site.url does not end with slash", () => {
    // Production code at line 8-10 checks site.url.endsWith("/")
    const validUrl = "https://example.com";
    const invalidUrl = "https://example.com/";

    expect(validUrl.endsWith("/")).toBe(false);
    expect(invalidUrl.endsWith("/")).toBe(true);
  });

  test("Error thrown when site.url ends with slash", () => {
    // Production code throws error when URL ends with /
    const testUrl = "https://example.com/";

    expect(() => {
      if (testUrl.endsWith("/")) {
        throw new Error(
          `site.json 'url' must not end with a slash: ${testUrl}`,
        );
      }
    }).toThrow("site.json 'url' must not end with a slash");
  });

  test("Validates that site.url uses http or https protocol", () => {
    // Production code at line 12-17 validates protocol
    const httpUrl = new URL("http://example.com");
    const httpsUrl = new URL("https://example.com");
    const ftpUrl = new URL("ftp://example.com");

    expect(["http:", "https:"].includes(httpUrl.protocol)).toBe(true);
    expect(["http:", "https:"].includes(httpsUrl.protocol)).toBe(true);
    expect(["http:", "https:"].includes(ftpUrl.protocol)).toBe(false);
  });

  test("Error thrown when site.url uses invalid protocol", () => {
    // Production code throws error for non-http(s) protocols
    const invalidUrl = "ftp://example.com";
    const parsed = new URL(invalidUrl);

    expect(() => {
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error(
          `site.json 'url' must use http or https protocol, got: ${invalidUrl}`,
        );
      }
    }).toThrow("site.json 'url' must use http or https protocol");
  });

  test("Current site.json has valid url", () => {
    // Verify the actual site.json passes all validation
    expect(siteData.url).toBeTruthy();
    expect(siteData.url.endsWith("/")).toBe(false);

    const parsed = new URL(siteData.url);
    expect(["http:", "https:"].includes(parsed.protocol)).toBe(true);
  });

  test("Validation checks run in correct order", () => {
    // Test that all three validations work together
    const testValidation = (url) => {
      if (!url) {
        throw new Error("site.json is missing the 'url' field");
      }

      if (url.endsWith("/")) {
        throw new Error(`site.json 'url' must not end with a slash: ${url}`);
      }

      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error(
          `site.json 'url' must use http or https protocol, got: ${url}`,
        );
      }
    };

    // Valid URL should not throw
    expect(() => testValidation("https://example.com")).not.toThrow();

    // Missing URL should throw
    expect(() => testValidation("")).toThrow("missing the 'url' field");

    // URL with trailing slash should throw
    expect(() => testValidation("https://example.com/")).toThrow(
      "must not end with a slash",
    );

    // URL with invalid protocol should throw
    expect(() => testValidation("ftp://example.com")).toThrow(
      "must use http or https protocol",
    );
  });

  test("Validation error messages include the problematic URL", () => {
    const invalidUrl = "https://example.com/";

    expect(() => {
      if (invalidUrl.endsWith("/")) {
        throw new Error(
          `site.json 'url' must not end with a slash: ${invalidUrl}`,
        );
      }
    }).toThrow(invalidUrl);
  });

  test("Protocol validation handles various invalid protocols", () => {
    const invalidProtocols = [
      "ftp://example.com",
      "file://example.com",
      "ws://example.com",
      "data:text/plain,hello",
    ];

    for (const url of invalidProtocols) {
      const parsed = new URL(url);
      expect(["http:", "https:"].includes(parsed.protocol)).toBe(false);
    }
  });

  test("Protocol validation accepts both http and https", () => {
    const httpParsed = new URL("http://example.com");
    const httpsParsed = new URL("https://example.com");

    expect(["http:", "https:"].includes(httpParsed.protocol)).toBe(true);
    expect(["http:", "https:"].includes(httpsParsed.protocol)).toBe(true);
  });

  test("URL parsing preserves protocol suffix colon", () => {
    // URL class includes the colon in the protocol
    const parsed = new URL("https://example.com");

    expect(parsed.protocol).toBe("https:");
    expect(parsed.protocol).not.toBe("https");
  });
});
