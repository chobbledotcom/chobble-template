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

export { normaliseSlug };
