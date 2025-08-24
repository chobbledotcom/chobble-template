const buildCategoryImageMap = (categories, products) => {
	if (!categories || !Array.isArray(categories)) categories = [];
	if (!products || !Array.isArray(products)) products = [];
	
	const initialMapping = categories.reduce(
		(acc, category) => ({
			...acc,
			[category.fileSlug]: [category.data.header_image, -1],
		}),
		{},
	);

	const productImageEntries = products
		.filter((product) => product.data.header_image)
		.flatMap((product) => {
			return (product.data.categories || []).map((slug) => {
				return {
					categorySlug: slug,
					image: product.data.header_image,
					order: product.data.order || 0,
				};
			});
		});

	return productImageEntries.reduce((acc, { categorySlug, image, order }) => {
		const currentEntry = acc[categorySlug];
		const shouldOverride = !currentEntry || currentEntry[1] < order;

		return shouldOverride ? { ...acc, [categorySlug]: [image, order] } : acc;
	}, initialMapping);
};

const assignCategoryImages = (categories, categoryImages) => {
	if (!categories || !Array.isArray(categories)) return [];
	// NOTE: This function mutates category objects directly rather than using
	// functional programming patterns (like spread operators) because Eleventy
	// template objects have special getters and internal state. Using spread
	// operators triggers premature access to templateContent, causing errors.
	return categories.map((category) => {
		category.data.header_image = categoryImages[category.fileSlug]?.[0];
		return category;
	});
};

const createCategoriesCollection = (collectionApi) => {
	const categories = collectionApi.getFilteredByTag("category");

	if (!categories || categories.length === 0) return [];

	const products = collectionApi.getFilteredByTag("product");
	const categoryImages = buildCategoryImageMap(categories, products);

	return assignCategoryImages(categories, categoryImages);
};

const getFeaturedCategories = (categories) =>
	categories?.filter((c) => c.data.featured) || [];

const configureCategories = (eleventyConfig) => {
	eleventyConfig.addCollection("categories", createCategoriesCollection);
	eleventyConfig.addFilter("getFeaturedCategories", getFeaturedCategories);
};

export {
	buildCategoryImageMap,
	assignCategoryImages,
	createCategoriesCollection,
	getFeaturedCategories,
	configureCategories,
};
