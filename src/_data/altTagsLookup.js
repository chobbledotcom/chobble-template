import altTags from "#data/alt-tags.json" with { type: "json" };
import { toObject } from "#utils/object-entries.js";

// Pre-compute a filename -> alt text lookup map
// This avoids O(n) loops in templates when looking up alt text
export default toObject(altTags?.images || [], (entry) => [
  entry.path.split("/").pop(),
  entry.alt || "",
]);
