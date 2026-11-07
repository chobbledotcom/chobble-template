import altTags from "#data/alt-tags.json" with { type: "json" };
import { toObject } from "#toolkit/fp/object.js";

// Pre-compute an image path -> alt text lookup map.
// Keying by the full path keeps images that share a filename (e.g. two
// products' "01.jpg") from overwriting each other's alt text.
// This avoids O(n) loops in templates when looking up alt text.
export default toObject(
  /** @type {{ path: string, alt?: string }[]} */ (altTags?.images || []),
  (entry) => [entry.path, entry.alt || ""],
);
