import { computeGallery } from "#collections/products.js";
import { contentTypeData } from "#utils/content-type-data.js";
import { normaliseSlug } from "#utils/slug-utils.js";

export default contentTypeData("property", {
  locations: (data) => (data.locations || []).map(normaliseSlug),
  gallery: computeGallery,
});
