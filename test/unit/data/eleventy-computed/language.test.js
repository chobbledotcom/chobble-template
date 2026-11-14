/**
 * The computed layer is where the language data gets its defaults, so a site
 * with no languages.json reaches the resolver with an empty list rather than
 * undefined.
 */

import { describe, expect, test } from "vitest";
import eleventyComputed from "#data/eleventyComputed.js";
import { DE, EN, ABOUT_GROUP as GROUP } from "#test/fixtures/languages.js";

describe("eleventyComputed.pageLanguage", () => {
  test("reads a page's language from its URL prefix", () => {
    const data = { page: { url: "/de/ueber-uns/" }, languages: [EN, DE] };
    expect(eleventyComputed.pageLanguage(data)).toBe(DE);
  });

  test("puts a page outside every prefix in the base language", () => {
    const data = { page: { url: "/about/" }, languages: [EN, DE] };
    expect(eleventyComputed.pageLanguage(data)).toBe(EN);
  });

  test("has no language for a site that declares none", () => {
    expect(
      eleventyComputed.pageLanguage({ page: { url: "/about/" } }),
    ).toBeUndefined();
  });
});

describe("eleventyComputed.pageTranslation", () => {
  test("finds the page's counterparts in the other languages", () => {
    const data = { page: { url: "/about/" }, translations: [GROUP] };
    expect(eleventyComputed.pageTranslation(data)).toEqual(GROUP);
  });

  test("finds nothing for a page nobody has translated", () => {
    const data = { page: { url: "/products/" }, translations: [GROUP] };
    expect(eleventyComputed.pageTranslation(data)).toBeNull();
  });

  test("finds nothing for a site that pairs no pages", () => {
    expect(
      eleventyComputed.pageTranslation({ page: { url: "/about/" } }),
    ).toBeNull();
  });
});
