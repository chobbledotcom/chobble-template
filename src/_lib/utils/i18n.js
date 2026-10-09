/**
 * Which language a page is written in, and where the same page is written in
 * the other languages a site publishes.
 *
 * Nothing here names a language. A site declares its languages in
 * `_data/languages.json`, one of which is the base language, and pairs up the
 * pages that say the same thing in `_data/translations.json`. Both arrive
 * through the data cascade rather than being imported here, so a site that
 * replaces either file gets its own languages without this module holding the
 * template's.
 *
 * A site that declares one language and no translations resolves every page to
 * that language with no alternates, which is the case this has to stay quiet
 * for.
 */

/**
 * What is wrong with a site's language declarations, as messages, or nothing.
 * A site publishes one base language, no more and no fewer: both
 * `hreflang="x-default"` and every page's language are chosen by that flag, so
 * none leaves a translated set without an x-default and two leave it with two.
 * `validated-config.js` calls this once at load, which is why the resolver
 * below trusts its input.
 * @param {import("#lib/types").Language[]} languages
 * @returns {string[]}
 */
export const baseLanguageErrors = (languages) => {
  const bases = languages.filter((language) => language.is_default);
  if (bases.length === 1) return [];
  return [
    `_data/languages.json marks ${bases.length} languages with is_default: true, and must mark exactly one.`,
  ];
};

/**
 * The language of one URL, read from the URL prefix each language is published
 * under. Anything outside every other language's prefix, including the sitemap
 * and the feeds, is in the base language.
 *
 * Exactly one language is marked `is_default`, which `validated-config.js`
 * checks once at load, so this does not re-check per page. Eleventy probes
 * computed data with a placeholder object that has no fields at all before it
 * builds the dependency map, and a check here would fail the build on that
 * rather than on anything a site wrote.
 * @param {string|undefined} url
 * @param {import("#lib/types").Language[]} languages - Every language the site
 *   publishes, defaulted in the data layer rather than here
 * @returns {import("#lib/types").Language}
 */
export const languageForUrl = (url, languages) => {
  const base =
    languages.find((language) => language.is_default) || languages[0];
  if (typeof url !== "string") return base;
  // Longest prefix first, so a page under /de/at/ is Austrian German rather
  // than German when a site publishes both.
  const [longest] = languages
    .filter((language) => language !== base)
    .filter((language) => url.startsWith(language.home_url))
    .sort((a, b) => b.home_url.length - a.home_url.length);
  return longest || base;
};

/**
 * Where a page sits for working out its language: its URL, or - for a page
 * with no URL of its own (`permalink: false`, such as a navigation entry that
 * links elsewhere) - its source path inside its collection directory, so
 * `src/pages/es/visit.md` is Spanish like the pages published under /es/.
 * @param {{ url?: string | false, filePathStem?: string } | undefined} page
 * @returns {string | undefined}
 */
export const pageLocation = (page) =>
  typeof page?.url === "string"
    ? page.url
    : page?.filePathStem?.replace(/^\/[^/]+/, "");

/**
 * Everything a language declares beyond the optional `is_default` flag. None
 * of it comes from a page: the templates read these straight through, so a
 * language missing one publishes an empty `hreflang`, an unnamed breadcrumb
 * landmark, or a skip link with no text — bugs a screen reader meets long
 * before anyone sees them.
 */
/* jscpd:ignore-start -- declaration data: required language field list */
/** @type {Array<keyof import("#lib/types").Language>} */
const REQUIRED_LANGUAGE_FIELDS = [
  "code",
  "hreflang",
  "og_locale",
  "label",
  "home_url",
  "home_label",
  "breadcrumb_label",
  "skip_to_content_label",
  "search_label",
  "navigation_label",
  "menu_label",
  "close_menu_label",
  "submenu_label",
  "gallery_label",
  "close_gallery_label",
  "previous_image_label",
  "next_image_label",
  "gallery_images_label",
  "download_label",
  "load_more_label",
  "no_results_label",
  "back_to_label",
  "result_count_one_label",
  "result_count_other_label",
  "redirect_label",
  "redirect_link_label",
];
/* jscpd:ignore-end */

/**
 * What is wrong with the fields every language must declare, as messages, or
 * nothing. `validated-config.js` calls this once at load alongside
 * `baseLanguageErrors`, so the templates reading these values can trust them.
 * Each message names its language, so a site that mis-declares one is told
 * which rather than being left to count entries in `_data/languages.json`.
 * @param {import("#lib/types").Language[]} languages
 * @returns {string[]}
 */
export const languageFieldErrors = (languages) => {
  /** @param {import("#lib/types").Language} language */
  const errorsFor = (language) => {
    const name = language.code ? `"${language.code}"` : "with no code";
    return REQUIRED_LANGUAGE_FIELDS.filter((key) => !language[key]).map(
      (key) =>
        `_data/languages.json language ${name} is missing a non-empty "${key}".`,
    );
  };
  return languages.flatMap(errorsFor);
};

/**
 * The URLs of one page in every language it has been written in, keyed by
 * language code, or null when the page exists in one language only.
 * @param {string|undefined} url
 * @param {Array<Record<string, string>>} translations - Every group of pages
 *   that say the same thing, defaulted in the data layer rather than here
 * @returns {Record<string, string>|null}
 */
export const translationForUrl = (url, translations) => {
  const found = translations.find((group) =>
    Object.values(group).some((value) => value === url),
  );
  return found === undefined ? null : found;
};
