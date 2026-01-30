import { computeGallery } from "#collections/products.js";
import { linkableContent } from "#utils/linkable-content.js";
import { normaliseSlug } from "#utils/slug-utils.js";

export default linkableContent("property", {
  locations: (data) => (data.locations || []).map(normaliseSlug),
  gallery: computeGallery,
});
