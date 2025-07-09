import { normaliseSlug } from "../_lib/slug-utils.js";

export default {
	eleventyComputed: {
		menus: (data) => {
			const menus = data.menus || [];
			return menus.map(normaliseSlug);
		},
	},
};