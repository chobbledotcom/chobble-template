/**
 * Slug utilities for URL generation and title formatting.
 *
 * Uses @sindresorhus/slugify (same as Eleventy) for consistent slug generation.
 * normaliseSlug handles PagesCMS references which use full paths - extracts
 * just the filename minus extension for simpler URLs.
 */
import slugify from "@sindresorhus/slugify";
import { pipe, split } from "#toolkit/fp/array.js";

/**
 * @typedef {Object} PageData
 * @property {string} [permalink] - Custom permalink
 * @property {{ fileSlug: string }} page - Page info from Eleventy
 */

/**
 * Normalize a PagesCMS reference to just the filename without extension
 * @param {string | null | undefined} reference - Full path reference
 * @returns {string | null | undefined} Normalized slug
 */
const normaliseSlug = (reference) => {
  if (!reference) return reference;
  return pipe(
    split("/"),
    (parts) => parts.at(-1),
    (filename) => filename.replace(/\.md$/, ""),
  )(reference);
};

/**
 * Normalise a user-provided permalink so Eleventy treats it as a directory.
 *
 * Bare strings like "foo-bar" become "/foo-bar/".  Permalinks that already
 * have the right shape, contain Liquid templates, or include a file extension
 * are returned unchanged.
 *
 * @param {string} permalink - Raw permalink from frontmatter
 * @returns {string} Normalised permalink
 */
const normalisePermalink = (permalink) => {
  if (typeof permalink !== "string") return permalink;

  // Don't touch Liquid/Nunjucks templates or paths with file extensions
  if (permalink.includes("{{") || permalink.includes(".")) return permalink;

  const withLeadingSlash = permalink.startsWith("/")
    ? permalink
    : `/${permalink}`;

  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
};

/**
 * Build a permalink for a page
 * @param {PageData} data - Page data from Eleventy
 * @param {string} dir - Directory name for URL
 * @returns {string} Permalink URL
 */
const buildPermalink = (data, dir) => {
  if (data.permalink) return normalisePermalink(data.permalink);
  return `/${dir}/${data.page.fileSlug}/`;
};

/**
 * Build a PDF filename from business name and menu slug
 * @param {string} businessName - Business name to slugify
 * @param {string} menuSlug - Menu slug
 * @returns {string} PDF filename
 */
const buildPdfFilename = (businessName, menuSlug) =>
  `${slugify(businessName)}-${menuSlug}.pdf`;

export {
  slugify,
  normaliseSlug,
  normalisePermalink,
  buildPermalink,
  buildPdfFilename,
};
