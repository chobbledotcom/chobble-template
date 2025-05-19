import strings from "../_data/strings.js";

export default {
	eleventyComputed: {
		categories: (data) => {
			const categories = data.categories || [];
			return categories.map((category) => {
				// allow categories to be named like "example.md" - which is how
				// pagescms.org identifies them
				return category.split(".")[0];
			});
		},
		navigationParent: () => strings.product_name,
		permalink: (data) => {
			const dir = strings.product_permalink_dir || "products";
			return `${dir}/${data.page.fileSlug}/`;
		}
	},
};
