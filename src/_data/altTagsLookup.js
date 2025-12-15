import altTags from "./alt-tags.json" with { type: "json" };

// Pre-compute a filename -> alt text lookup map
// This avoids O(n) loops in templates when looking up alt text
const buildLookup = () => {
  const lookup = {};

  if (altTags?.images) {
    for (const entry of altTags.images) {
      // Extract filename from path
      const filename = entry.path.split("/").pop();
      lookup[filename] = entry.alt || "";
    }
  }

  return lookup;
};

export default buildLookup();
