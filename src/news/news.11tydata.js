import { contentTypeData } from "#utils/content-type-data.js";
import { normaliseSlug } from "#utils/slug-utils.js";

export default contentTypeData("news", {
  authorSlug: (data) => {
    if (!data.author) return null;
    return normaliseSlug(data.author);
  },
});
