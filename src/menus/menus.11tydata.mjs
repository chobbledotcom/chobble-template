import { buildBaseMeta } from "../_lib/schema-helper.mjs";

export default {
	eleventyComputed: {
		meta: (data) => buildBaseMeta(data),
		eleventyNavigation: (data) => {
			return {
				key: data.title,
				parent: data.strings.menus_name,
				order: data.order || 0,
			};
		},
		allDietaryKeys: (data) => {
			const menuCategories = (data.collections.menu_category || [])
				.filter((cat) => cat.data.menus?.includes(data.page.fileSlug))
				.sort((a, b) => (a.data.order || 0) - (b.data.order || 0));

			const allItems = menuCategories.flatMap((category) =>
				(data.collections.menu_item || []).filter((item) =>
					item.data.menu_categories?.includes(category.fileSlug),
				),
			);

			const dietaryKeys = allItems
				.flatMap((item) => item.data.dietaryKeys || [])
				.filter((key) => key.symbol && key.label);

			return [...new Map(dietaryKeys.map((key) => [key.symbol, key])).values()];
		},
	},
};
