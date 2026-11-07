import altTags from "#data/alt-tags.json" with { type: "json" };
import { normalizeImageUrl } from "#media/image-utils.js";
import { toObject } from "#toolkit/fp/object.js";

// Pre-compute a canonical image URL -> alt text lookup map.
// Entries are keyed by the full path (not the bare filename) so images that
// share a filename, e.g. two products' "01.jpg", keep their own alt text.
// Keys go through normalizeImageUrl so an entry matches every image reference
// shape the templates accept ("/images/01.jpg", "src/images/01.jpg",
// "images/01.jpg", "01.jpg") instead of only the one it was written in.
// This avoids O(n) loops in templates when looking up alt text.
export default toObject(
  /** @type {{ path: string, alt?: string }[]} */ (altTags?.images || []),
  (entry) => [normalizeImageUrl(entry.path), entry.alt || ""],
);
