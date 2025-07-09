const processGallery = (gallery) => {
	if (!gallery) return gallery;

	return Object.entries(gallery).map(([alt, filename]) => ({
		alt: parseInt(alt).toString() === alt ? "" : alt,
		filename,
	}));
};

const addGallery = (item) => {
	// NOTE: This function mutates the item object directly rather than using
	// functional programming patterns (like spread operators) because Eleventy
	// template objects have special getters and internal state. Using spread
	// operators triggers premature access to templateContent, causing errors.
	if (item.data.gallery) {
		item.data.gallery = processGallery(item.data.gallery);
	}
	return item;
};

const createProductsCollection = (collectionApi) =>
	collectionApi.getFilteredByTag("product").map(addGallery);

const getProductsByCategory = (products, categorySlug) =>
	products.filter((product) => product.data.categories?.includes(categorySlug));

const getReviewsByProduct = (reviews, productSlug) =>
	(reviews || []).filter((review) =>
		review.data.products?.includes(productSlug),
	);

const configureProducts = (eleventyConfig) => {
	eleventyConfig.addCollection("products", createProductsCollection);

	eleventyConfig.addFilter("getProductsByCategory", getProductsByCategory);

	eleventyConfig.addFilter("getReviewsByProduct", getReviewsByProduct);
};

module.exports = {
	processGallery,
	addGallery,
	createProductsCollection,
	getProductsByCategory,
	getReviewsByProduct,
	configureProducts,
};
