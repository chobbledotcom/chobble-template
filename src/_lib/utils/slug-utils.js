/**
 * Slug utilities for URL generation and title formatting.
 *
 * Uses @sindresorhus/slugify (same as Eleventy) for consistent slug generation.
 * normaliseSlug handles PagesCMS references which use full paths - extracts
 * just the filename minus extension for simpler URLs.
 */
import slugify from "@sindresorhus/slugify";

import { join, map, pipe, split } from "#utils/array-utils.js";

const normaliseSlug = (reference) => {
  if (!reference) return reference;
  return pipe(
    split("/"),
    (parts) => parts.at(-1),
    (filename) => filename.replace(/\.md$/, ""),
  )(reference);
};

const buildPermalink = (data, dir) => {
  if (data.permalink) return data.permalink;
  return `/${dir}/${data.page.fileSlug}/`;
};

const buildPdfFilename = (businessName, menuSlug) =>
  `${slugify(businessName)}-${menuSlug}.pdf`;

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
