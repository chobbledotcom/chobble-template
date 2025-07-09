import strings from "../_data/strings.js";
import { normaliseSlug } from "../_lib/slug-utils.js";

export default {
	eleventyComputed: {
		products: (data) => {
			const products = data.products || [];
			return products.map(normaliseSlug);
		},
	},
};
