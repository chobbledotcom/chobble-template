/**
 * The language declarations a translated site would put in
 * `_data/languages.json`, shared by every test that needs more than the one
 * language the template ships.
 */

/** @type {import("#lib/types").Language} */
export const EN = {
  code: "en",
  hreflang: "en-GB",
  og_locale: "en_GB",
  label: "English",
  home_url: "/",
  home_label: "Home",
  breadcrumb_label: "Breadcrumb",
  is_default: true,
};

/** @type {import("#lib/types").Language} */
export const DE = {
  code: "de",
  hreflang: "de",
  og_locale: "de_DE",
  label: "Deutsch",
  home_url: "/de/",
  home_label: "Startseite",
  breadcrumb_label: "Brotkrumennavigation",
  is_default: false,
};

/**
 * A language published under a prefix inside another language's prefix, so a
 * URL can match two of them at once.
 * @type {import("#lib/types").Language}
 */
export const DE_AT = {
  ...DE,
  code: "de-at",
  hreflang: "de-AT",
  og_locale: "de_AT",
  label: "Deutsch (Österreich)",
  home_url: "/de/at/",
};

/** One page, written in both languages. */
export const ABOUT_GROUP = { en: "/about/", de: "/de/ueber-uns/" };
