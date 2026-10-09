/**
 * Central registry for the site's standalone Eleventy filters.
 *
 * Every entry in FILTERS is registered under its key, so this file is the
 * single place to see which simple filters exist. Filters that belong to a
 * larger subsystem (blocks, breadcrumbs, collections, media…) are registered
 * by that subsystem's own configure* module instead.
 *
 * A code-quality test asserts every registered filter is referenced by a
 * template, so an entry here must have a consumer under src/.
 */
import {
  dateToRfc3339,
  getNewestCollectionItemDate,
} from "@11ty/eleventy-plugin-rss";
import { fileInfo } from "#eleventy/file-info.js";
import { registerFilters } from "#eleventy/register.js";
import { canonicalUrl } from "#utils/canonical-url.js";
import { filterItems } from "#utils/collection-filter.js";
import { sort } from "#utils/fp/array.js";
import { frozenObject } from "#utils/fp/object.js";
import { compareBy } from "#utils/fp/sorting.js";
import { datesFor, formatIso } from "#utils/git-dates.js";
import { sortItems } from "#utils/sorting.js";

const BUILD_TIMESTAMP = Math.floor(Date.now() / 1000);

/**
 * Append a build-time cache-busting query string in production builds.
 * @param {string} url
 */
const cacheBust = (url) => {
  const isProduction = process.env.ELEVENTY_RUN_MODE === "build";
  return isProduction ? `${url}?cached=${BUILD_TIMESTAMP}` : url;
};

/**
 * Remove matches of a regex pattern from a string and trim the result.
 *
 * Used by the link-columns block so authors can strip repetitive text
 * (e.g. `"Service in "` from titles like "Service in Town A") without
 * editing the source item titles.
 *
 * @param {string} str - Source string.
 * @param {string} pattern - JavaScript regex source (global flag is applied).
 * @returns {string} String with all matches removed and whitespace trimmed.
 *   Returns the input unchanged if `pattern` is falsy.
 */
const removePattern = (str, pattern) => {
  if (!pattern) return str;
  return str.replace(new RegExp(pattern, "g"), "").trim();
};

/**
 * Split a string into ordered segments around `#hashtag` matches so a template
 * can wrap the tag segments in markup (e.g. a muted span) without any HTML
 * being constructed in JS.
 *
 * @param {string} str - Source string.
 * @returns {Array<{ text: string, isTag: boolean }>} Ordered segments. Tag
 *   segments include the leading `#`. Returns an empty array for non-string or
 *   empty input.
 */
const splitHashtags = (str) => {
  if (typeof str !== "string" || str === "") return [];
  // Capturing group keeps matches in the split output at odd indexes.
  return str
    .split(/(#\w+)/)
    .map((text, index) => ({ text, isTag: index % 2 === 1 }))
    .filter((segment) => segment.text !== "");
};

const byName = sort(compareBy((item) => item.data.name));

/**
 * Alphabetise a collection, drop the current page, and attach the separator
 * each entry needs in a prose list ("a, b and c").
 * @param {Array<{ url: string, data: { name: string } }>} collection
 * @param {string} currentUrl
 */
const prepareItemsTextList = (collection, currentUrl) => {
  if (!collection?.length) return [];
  const filtered = byName(collection.filter((item) => item.url !== currentUrl));
  /** @param {number} index */
  const separator = (index) => {
    if (index === filtered.length - 1) return "";
    if (index === filtered.length - 2) return " and ";
    return ", ";
  };
  return filtered.map((item, index) => ({
    url: item.url,
    name: item.data.name,
    separator: separator(index),
  }));
};

/** Filter name → implementation, registered verbatim by configureFilters. */
const FILTERS = frozenObject({
  cacheBust,
  canonicalUrl,
  dateToRfc3339,
  fileInfo,
  filterItems,
  getNewestCollectionItemDate,
  gitDates: datesFor,
  isoDate: formatIso,
  prepareItemsTextList,
  removePattern,
  sortItems: sort(sortItems),
  splitHashtags,
});

/** @param {*} eleventyConfig */
export const configureFilters = (eleventyConfig) =>
  registerFilters(eleventyConfig)(FILTERS);
