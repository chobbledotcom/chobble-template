import slugify from "@sindresorhus/slugify";

// The 'reference' type objects in PagesCMS use the full
// path as the reference, but it's nicer to use just the
// filename minus extension - so we support both.

const normaliseSlug = (reference) => {
  if (!reference) return reference;
  const pathParts = reference.split("/");
  const filename = pathParts[pathParts.length - 1];
  return filename.replace(/\.md$/, "");
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
const slugToTitle = (slug) =>
  slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export { normaliseSlug, buildPermalink, buildPdfFilename, slugToTitle };
