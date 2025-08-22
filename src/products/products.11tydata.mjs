import strings from "../_data/strings.js";
import { normaliseSlug } from "../_lib/slug-utils.js";
import { buildProductMeta } from "../_lib/schema-helper.js";

export default {
	eleventyComputed: {
		categories: (data) => {
			const categories = data.categories || [];
			return categories.map(normaliseSlug);
		},
		navigationParent: () => strings.product_name,
		permalink: (data) => {
			const dir = strings.product_permalink_dir || "products";
			return `${dir}/${data.page.fileSlug}/`;
		},
		meta: (data) => buildProductMeta(data),
	},
};
