import strings from "../_data/strings.js";
import { buildProductMeta } from "../_lib/schema-helper.mjs";
import { normaliseSlug } from "../_lib/slug-utils.js";

export default {
	eleventyComputed: {
		categories: (data) => {
			const categories = data.categories || [];
			return categories.map(normaliseSlug);
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
		navigationParent: () => strings.product_name,
		permalink: (data) => {
			if (data.permalink) return data.permalink;
			const dir = strings.product_permalink_dir || "products";
			return `${dir}/${data.page.fileSlug}/`;
		},
		meta: (data) => buildProductMeta(data),
	},
};
