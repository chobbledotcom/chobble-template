import altTags from "#data/alt-tags.json" with { type: "json" };
import { normalizeImageUrl } from "#media/image-utils.js";
import { toObject } from "#toolkit/fp/object.js";

// Pre-compute a canonical image URL -> alt text lookup map. Keys use the full
// path (not the bare filename), so images that share a filename, e.g. two
// products' "01.jpg", keep their own alt text. Keys and the template lookup
// both go through normalizeImageUrl, so every accepted reference shape
// ("/images/01.jpg", "src/images/01.jpg", "01.jpg") hits the same entry.
export default toObject(
  /** @type {{ path: string, alt?: string }[]} */ (altTags?.images || []),
  (entry) => [normalizeImageUrl(entry.path), entry.alt || ""],
);
