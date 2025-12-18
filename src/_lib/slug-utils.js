// The 'reference' type objects in PagesCMS use the full
// path as the reference, but it's nicer to use just the
// filename minus extension - so we support both.

const normaliseSlug = (reference) => {
  if (!reference) return reference;

  // Remove file extension if present
  const withoutExtension = reference.split(".")[0];

  // Split by path separator and take the last part
  const pathParts = withoutExtension.split("/");
  return pathParts[pathParts.length - 1];
};

// Build a permalink for a collection item
// Returns existing permalink if set, otherwise builds from dir + fileSlug
const buildPermalink = (data, dir) => {
  if (data.permalink) return data.permalink;
  return `/${dir}/${data.page.fileSlug}/`;
};

// Build a permalink for guide pages: /guide/category-slug/page-slug/
const buildGuidePagePermalink = (data, dir) => {
  if (data.permalink) return data.permalink;
  const category = normaliseSlug(data.guide_category) || "uncategorized";
  return `/${dir}/${category}/${data.page.fileSlug}/`;
};

export { normaliseSlug, buildPermalink, buildGuidePagePermalink };
