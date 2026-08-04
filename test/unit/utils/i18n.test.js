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
import {
  baseLanguageErrors,
  languageForUrl,
  translationForUrl,
} from "#utils/i18n.js";

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

describe("baseLanguageErrors", () => {
  test("accepts one base language", () => {
    expect(baseLanguageErrors([EN, DE])).toEqual([]);
  });

  test("rejects a site that marks none", () => {
    expect(baseLanguageErrors([{ ...EN, is_default: false }, DE])).toEqual([
      "_data/languages.json marks 0 languages with is_default: true, and must mark exactly one.",
    ]);
  });

  test("rejects a site that marks two", () => {
    // head-hreflang.html writes an x-default per marked language, so two would
    // publish a set with two x-defaults in it.
    expect(baseLanguageErrors([EN, { ...DE, is_default: true }])).toEqual([
      "_data/languages.json marks 2 languages with is_default: true, and must mark exactly one.",
    ]);
  });

  test("accepts what the template ships", () => {
    expect(baseLanguageErrors(languages)).toEqual([]);
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

  test("takes the first language when a probe object marks none", () => {
    // validated-config.js rejects a site that marks no base language, so the
    // only caller that reaches this is Eleventy probing computed data with a
    // placeholder before it builds the dependency map.
    const unmarked = { ...EN, is_default: false };
    expect(languageForUrl("/about/", [unmarked, DE])).toBe(unmarked);
  });

  test("falls back to the base language without a URL", () => {
    expect(languageForUrl(undefined, [EN, DE])).toBe(EN);
  });

  test("has no language to give when none are declared", () => {
    expect(languageForUrl("/about/", [])).toBeUndefined();
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
