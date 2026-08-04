/**
 * A site that declares one language and no translations has to render exactly
 * as it did before any of this existed: every page in the base language, no
 * alternates, no switcher. That is what the template ships, so the shipped
 * data is checked here alongside the resolver, which is given the language
 * sets a translated site would declare.
 */

import { describe, expect, test } from "bun:test";
import languages from "#data/languages.json" with { type: "json" };
import translations from "#data/translations.json" with { type: "json" };
import { DE, DE_AT, EN } from "#test/fixtures/languages.js";
import { languageForUrl, translationForUrl } from "#utils/i18n.js";

const REQUIRED_FIELDS = [
  "code",
  "hreflang",
  "og_locale",
  "label",
  "home_url",
  "home_label",
  "breadcrumb_label",
];

describe("the language data the template ships", () => {
  test("declares exactly one base language", () => {
    expect(languages.filter((language) => language.is_default)).toHaveLength(1);
  });

  test("gives every language the fields the templates read", () => {
    for (const language of languages) {
      expect(REQUIRED_FIELDS.filter((field) => !language[field])).toEqual([]);
    }
  });

  test("pairs no pages until a site says so", () => {
    expect(translations).toEqual([]);
  });
});

describe("languageForUrl", () => {
  test("puts every page in the base language when there is one language", () => {
    for (const url of ["/", "/about/", "/products/thing/", "/sitemap.xml"]) {
      expect(languageForUrl(url, [EN])).toBe(EN);
    }
  });

  test("reads a language from the URL prefix it is published under", () => {
    expect(languageForUrl("/de/preise/", [EN, DE])).toBe(DE);
    expect(languageForUrl("/de/", [EN, DE])).toBe(DE);
  });

  test("leaves anything outside a prefix in the base language", () => {
    expect(languageForUrl("/pricing/", [EN, DE])).toBe(EN);
    expect(languageForUrl("/sitemap.xml", [EN, DE])).toBe(EN);
  });

  test("prefers the more specific of two matching prefixes", () => {
    // /de/at/preise/ sits under both /de/ and /de/at/, and belongs to the
    // language published under the longer one whichever order they are declared.
    expect(languageForUrl("/de/at/preise/", [EN, DE, DE_AT])).toBe(DE_AT);
    expect(languageForUrl("/de/at/preise/", [EN, DE_AT, DE])).toBe(DE_AT);
    expect(languageForUrl("/de/preise/", [EN, DE, DE_AT])).toBe(DE);
  });

  test("refuses a site that marks no base language", () => {
    // x-default is written from the same flag, so guessing a base here would
    // publish a language set with no x-default in it.
    const unmarked = { ...EN, is_default: false };
    expect(() => languageForUrl("/about/", [unmarked, DE])).toThrow(
      "must declare one language with is_default: true",
    );
  });

  test("falls back to the base language without a URL", () => {
    expect(languageForUrl(undefined, [EN, DE])).toBe(EN);
  });

  test("refuses a site that declares no languages at all", () => {
    expect(() => languageForUrl("/about/", [])).toThrow(
      "must declare one language with is_default: true",
    );
  });
});

describe("translationForUrl", () => {
  const groups = [
    { en: "/", de: "/de/" },
    { en: "/about/", de: "/de/ueber-uns/" },
  ];

  test("finds a page's counterparts from either side", () => {
    expect(translationForUrl("/about/", groups)).toEqual(groups[1]);
    expect(translationForUrl("/de/ueber-uns/", groups)).toEqual(groups[1]);
  });

  test("finds no counterpart for a page nobody has translated", () => {
    expect(translationForUrl("/products/", groups)).toBeNull();
  });

  test("finds no counterpart in an untranslated site", () => {
    expect(translationForUrl("/about/", [])).toBeNull();
  });
});
