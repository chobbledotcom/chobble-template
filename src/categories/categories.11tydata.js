module.exports = {
	eleventyComputed: {
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
