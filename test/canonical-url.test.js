import assert from "node:assert";
import { describe, it } from "node:test";
import { canonicalUrl } from "#utils/canonical-url.js";

describe("canonicalUrl", () => {
  it("joins site URL and page URL correctly", () => {
    assert.strictEqual(
      canonicalUrl("https://example.com", "/quote/"),
      "https://example.com/quote/",
    );
  });

  it("handles site URL with trailing slash", () => {
    assert.strictEqual(
      canonicalUrl("https://example.com/", "/quote/"),
      "https://example.com/quote/",
    );
  });

  it("handles site URL with multiple trailing slashes", () => {
    assert.strictEqual(
      canonicalUrl("https://example.com///", "/quote/"),
      "https://example.com/quote/",
    );
  });

  it("handles page URL without leading slash", () => {
    assert.strictEqual(
      canonicalUrl("https://example.com", "quote/"),
      "https://example.com/quote/",
    );
  });

  it("handles page URL with multiple leading slashes", () => {
    assert.strictEqual(
      canonicalUrl("https://example.com", "///quote/"),
      "https://example.com/quote/",
    );
  });

  it("handles both trailing and leading slashes", () => {
    assert.strictEqual(
      canonicalUrl("https://example.com/", "/quote/"),
      "https://example.com/quote/",
    );
  });

  it("handles root page URL without trailing slash", () => {
    assert.strictEqual(
      canonicalUrl("https://example.com", "/"),
      "https://example.com",
    );
  });

  it("handles root page URL even with trailing slash on site", () => {
    assert.strictEqual(
      canonicalUrl("https://example.com/", "/"),
      "https://example.com",
    );
  });

  it("handles empty page URL", () => {
    assert.strictEqual(
      canonicalUrl("https://example.com/", ""),
      "https://example.com",
    );
  });

  it("handles empty site URL", () => {
    assert.strictEqual(canonicalUrl("", "/quote/"), "/quote/");
  });

  it("handles null/undefined inputs", () => {
    assert.strictEqual(canonicalUrl(null, "/quote/"), "/quote/");
    assert.strictEqual(canonicalUrl(undefined, "/quote/"), "/quote/");
    assert.strictEqual(canonicalUrl("https://example.com", null), "https://example.com");
    assert.strictEqual(canonicalUrl("https://example.com", undefined), "https://example.com");
  });
});
