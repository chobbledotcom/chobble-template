module.exports = {
	eleventyComputed: {
		layout: (data) => "category.html",
		tags: (data) => "category",
		header_text: (data) => data.header_text || data.title,
		meta_title: (data) => data.meta_title || data.title,
		eleventyNavigation: (data) => {
			if (data.parent != null) return false;

			return {
				key: data.title,
				parent: "Products",
				order: data.link_order || 0,
			};
		},
	},
};
