/**
 * Slug utilities for URL generation and title formatting.
 *
 * Uses @sindresorhus/slugify (same as Eleventy) for consistent slug generation.
 * normaliseSlug handles PagesCMS references which use full paths - extracts
 * just the filename minus extension for simpler URLs.
 */
import slugify from "@sindresorhus/slugify";

import { join, map, pipe, split } from "#toolkit/fp/array.js";

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
 * Build a permalink for a page
 * @param {PageData} data - Page data from Eleventy
 * @param {string} dir - Directory name for URL
 * @returns {string} Permalink URL
 */
const buildPermalink = (data, dir) => {
  if (data.permalink) return data.permalink;
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

/**
 * Convert a slug to a title-case string
 * @param {string} slug - Slug to convert
 * @returns {string} Title-case string
 */
const slugToTitle = (slug) =>
  pipe(
    split("-"),
    map((word) => word.charAt(0).toUpperCase() + word.slice(1)),
    join(" "),
  )(slug);

export {
  slugify,
  normaliseSlug,
  buildPermalink,
  buildPdfFilename,
  slugToTitle,
};
