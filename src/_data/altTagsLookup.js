import altTags from "#data/alt-tags.json" with { type: "json" };
import { toObject } from "#toolkit/fp/object.js";

// Pre-compute a filename -> alt text lookup map
// This avoids O(n) loops in templates when looking up alt text
export default toObject(
  /** @type {{ path: string, alt?: string }[]} */ (altTags?.images || []),
  (entry) => [entry.path.split("/").pop() || entry.path, entry.alt || ""],
);
