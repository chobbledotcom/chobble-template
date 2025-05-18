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
	},
};
