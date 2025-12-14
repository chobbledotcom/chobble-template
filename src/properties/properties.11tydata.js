import strings from "../_data/strings.js";
import { buildPermalink, normaliseSlug } from "../_lib/slug-utils.js";

export default {
  eleventyComputed: {
    locations: (data) => {
      const locations = data.locations || [];
      return locations.map(normaliseSlug);
    },
    gallery: (data) => {
      if (data.gallery) {
        return data.gallery;
      }
      if (data.header_image) {
        return [data.header_image];
      }
      return undefined;
    },
    navigationParent: () => strings.property_name,
    permalink: (data) => buildPermalink(data, strings.property_permalink_dir),
  },
};
