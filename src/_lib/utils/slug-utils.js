// Use the same slugify that Eleventy uses internally
// (available as transitive dependency of @11ty/eleventy)
import slugify from "@sindresorhus/slugify";

import { join, map, pipe, split } from "#utils/array-utils.js";

// The 'reference' type objects in PagesCMS use the full
// path as the reference, but it's nicer to use just the
// filename minus extension - so we support both.

const normaliseSlug = (reference) => {
  if (!reference) return reference;
  return pipe(
    split("/"),
    (parts) => parts.at(-1),
    (filename) => filename.replace(/\.md$/, ""),
  )(reference);
};

// Build a permalink for a collection item
// Returns existing permalink if set, otherwise builds from dir + fileSlug
const buildPermalink = (data, dir) => {
  if (data.permalink) return data.permalink;
  return `/${dir}/${data.page.fileSlug}/`;
};

// Build a PDF filename from business name and menu slug
const buildPdfFilename = (businessName, menuSlug) =>
  `${slugify(businessName)}-${menuSlug}.pdf`;

// Convert a slug to title case (e.g., "90s-computer" -> "90s Computer")
const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);
const slugToTitle = (slug) =>
  pipe(split("-"), map(capitalize), join(" "))(slug);

export {
  slugify,
  normaliseSlug,
  buildPermalink,
  buildPdfFilename,
  slugToTitle,
};
