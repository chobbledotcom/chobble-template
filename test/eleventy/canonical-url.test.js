import { describe, expect, test } from "bun:test";
import siteData from "#data/site.json" with { type: "json" };
import { canonicalUrl } from "#utils/canonical-url.js";

// Constant: validated at module load, never changes during test execution
const SITE_URL = siteData.url;

describe("canonical-url", () => {
  // ===========================================
  // Basic Path Joining
  // ===========================================
  test("Core use case: page paths from Eleventy always have leading slash", () => {
    const result = canonicalUrl("/quote/");

    expect(result).toBe(`${SITE_URL}/quote/`);
  });

  test("Defensive: handle user content or malformed paths gracefully", () => {
    const result = canonicalUrl("quote/");

    expect(result).toBe(`${SITE_URL}/quote/`);
  });

  test("Defensive: malformed paths shouldn't create broken URLs", () => {
    const result = canonicalUrl("///quote/");

    expect(result).toBe(`${SITE_URL}/quote/`);
  });

  // ===========================================
  // Complex Paths (Real-world Scenarios)
  // ===========================================
  test("Products/categories can be nested several levels deep", () => {
    const result = canonicalUrl("/products/electronics/phones/iphone-15/");

    expect(result).toBe(`${SITE_URL}/products/electronics/phones/iphone-15/`);
  });

  test("Search pages and filtered views include query parameters", () => {
    const result = canonicalUrl("/search?q=test&category=all");

    expect(result).toBe(`${SITE_URL}/search?q=test&category=all`);
  });

  test("Deep links to page sections are valid canonical URLs", () => {
    const result = canonicalUrl("/about/#team");

    expect(result).toBe(`${SITE_URL}/about/#team`);
  });

  test("Combination of query params and fragment identifiers", () => {
    const result = canonicalUrl("/products?sort=price#filters");

    expect(result).toBe(`${SITE_URL}/products?sort=price#filters`);
  });

  // ===========================================
  // Special Characters
  // ===========================================
  test("URL-encoded characters must be preserved for valid URLs", () => {
    const result = canonicalUrl("/products/my%20product/");

    expect(result).toBe(`${SITE_URL}/products/my%20product/`);
  });

  test("International content uses unicode in URLs", () => {
    const result = canonicalUrl("/日本語/ページ/");

    expect(result).toBe(`${SITE_URL}/日本語/ページ/`);
  });

  test("Ampersands, equals signs in paths (not just query strings)", () => {
    const result = canonicalUrl("/compare/a=1&b=2/");

    expect(result).toBe(`${SITE_URL}/compare/a=1&b=2/`);
  });

  // ===========================================
  // Boundary Cases
  // ===========================================
  test("Deep hierarchies or long slugs shouldn't break URL construction", () => {
    const longSegment = "a".repeat(200);
    const result = canonicalUrl(`/category/${longSegment}/product/`);

    expect(result).toBe(`${SITE_URL}/category/${longSegment}/product/`);
  });

  test("Malformed input like //example.com should be treated as path", () => {
    // The function strips leading slashes and prepends one, so this becomes /example.com
    const result = canonicalUrl("//example.com/path");

    expect(result).toBe(`${SITE_URL}/example.com/path`);
  });

  test("Edge case: multiple slashes but no content", () => {
    const result = canonicalUrl("////");

    // After stripping leading slashes: "", prepend /: "/", so it's just site URL + /
    expect(result).toBe(`${SITE_URL}/`);
  });

  // ===========================================
  // Root/Empty/Null Handling
  // ===========================================
  test("Homepage canonical URL should be the bare site URL", () => {
    const result = canonicalUrl("/");

    expect(result).toBe(SITE_URL);
  });

  test("Missing page URL in templates should fall back to site URL", () => {
    const result = canonicalUrl("");

    expect(result).toBe(SITE_URL);
  });

  test("Template variable might be null if not set", () => {
    const result = canonicalUrl(null);

    expect(result).toBe(SITE_URL);
  });

  test("Template variable might be undefined if not passed", () => {
    const result = canonicalUrl(undefined);

    expect(result).toBe(SITE_URL);
  });
});
