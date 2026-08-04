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
 * The language of one URL, read from the URL prefix each language is published
 * under. Anything outside every other language's prefix, including the sitemap
 * and the feeds, is in the base language, which is the language marked
 * `is_default` or, failing that, the first one declared.
 * @param {string|undefined} url
 * @param {import("#lib/types").Language[]} languages - Every language the site
 *   publishes, defaulted in the data layer rather than here
 * @returns {import("#lib/types").Language|undefined}
 */
export const languageForUrl = (url, languages) => {
  if (languages.length === 0) return undefined;
  const base =
    languages.find((language) => language.is_default) || languages[0];
  if (typeof url !== "string") return base;
  // Longest prefix first, so a page under /de-at/ is Austrian German rather
  // than German when a site publishes both.
  const [longest] = languages
    .filter((language) => language !== base)
    .filter((language) => url.startsWith(language.home_url))
    .sort((a, b) => b.home_url.length - a.home_url.length);
  return longest || base;
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
