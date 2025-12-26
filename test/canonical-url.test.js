import assert from "node:assert";
import { describe, it } from "node:test";
import { canonicalUrl } from "#utils/canonical-url.js";

// Site URL from site.json is https://example.chobble.com
const SITE_URL = "https://example.chobble.com";

describe("canonicalUrl", () => {
  it("joins site URL and page URL correctly", () => {
    assert.strictEqual(canonicalUrl("/quote/"), `${SITE_URL}/quote/`);
  });

  it("handles page URL without leading slash", () => {
    assert.strictEqual(canonicalUrl("quote/"), `${SITE_URL}/quote/`);
  });

  it("handles page URL with multiple leading slashes", () => {
    assert.strictEqual(canonicalUrl("///quote/"), `${SITE_URL}/quote/`);
  });

  it("handles root page URL", () => {
    assert.strictEqual(canonicalUrl("/"), SITE_URL);
  });

  it("handles empty page URL", () => {
    assert.strictEqual(canonicalUrl(""), SITE_URL);
  });

  it("handles null/undefined inputs", () => {
    assert.strictEqual(canonicalUrl(null), SITE_URL);
    assert.strictEqual(canonicalUrl(undefined), SITE_URL);
  });
});
