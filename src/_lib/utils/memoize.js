import memoize from "memoize";

// Cache key for functions with (array, string) signature
// Uses array length as a sanity check combined with the slug
const cacheKeyArrayAndSlug = (args) => {
  const arr = args[0];
  const slug = args[1];
  return `${arr?.length || 0}:${slug}`;
};

export { memoize, cacheKeyArrayAndSlug };
