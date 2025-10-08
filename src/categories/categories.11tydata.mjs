import { buildBaseMeta } from "../_lib/schema-helper.mjs";
import strings from "../_data/strings.js";

export default {
	eleventyComputed: {
		navigationParent: () => strings.product_name,
		eleventyNavigation: (data) => {
			if (data.eleventyNavigation) return data.eleventyNavigation;
			if (data.parent != null) return false;
			return {
				key: data.title,
				parent: strings.product_name,
				order: data.link_order || 0,
			};
		},
		meta: (data) => buildBaseMeta(data),
	},
};
