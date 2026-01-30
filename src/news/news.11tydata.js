import { linkableContent } from "#utils/linkable-content.js";
import { normaliseSlug } from "#utils/slug-utils.js";

export default linkableContent("news", {
  authorSlug: (data) => {
    if (!data.author) return null;
    return normaliseSlug(data.author);
  },
});
