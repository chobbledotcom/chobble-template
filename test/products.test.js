import {
	createMockEleventyConfig,
	createTestRunner,
	expectStrictEqual,
	expectDeepEqual,
	expectFunctionType,
} from "./test-utils.js";

import {
	processGallery,
	addGallery,
	createProductsCollection,
	createReviewsCollection,
	createVisibleReviewsCollection,
	getProductsByCategory,
	getReviewsByProduct,
	getFeaturedProducts,
	configureProducts,
} from "../src/_lib/products.js";

const testCases = [
	{
		name: "processGallery-null",
		description: "Returns null/undefined gallery unchanged",
		test: () => {
			expectStrictEqual(
				processGallery(null),
				null,
				"Should return null unchanged",
			);
			expectStrictEqual(
				processGallery(undefined),
				undefined,
				"Should return undefined unchanged",
			);
		},
	},
	{
		name: "processGallery-object",
		description: "Converts object galleries to arrays of filenames",
		test: () => {
			const input = {
				0: "image1.jpg",
				1: "image2.jpg",
				2: "image3.jpg",
				3: "image4.jpg",
			};

			const result = processGallery(input);

			expectStrictEqual(result.length, 4, "Should return 4 items");
			expectDeepEqual(
				result,
				["image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg"],
				"Should convert object to array of filenames",
			);
		},
	},

	{
		name: "addGallery-no-gallery",
		description: "Handles items without gallery",
		test: () => {
			const item = {
				data: {
					title: "Test Product",
					price: 100,
				},
			};

			const result = addGallery(item);

			expectDeepEqual(
				result.data.gallery,
				undefined,
				"Should preserve undefined gallery",
			);
			expectStrictEqual(
				result.data.title,
				item.data.title,
				"Should preserve other data",
			);
			expectStrictEqual(result, item, "Should return same object");
		},
	},
	{
		name: "addGallery-with-gallery",
		description: "Processes gallery in item data",
		test: () => {
			const item = {
				data: {
					title: "Test Product",
					gallery: ["product.jpg", "gallery1.jpg"],
				},
			};

			const result = addGallery(item);

			expectStrictEqual(
				result.data.gallery.length,
				2,
				"Should have 2 gallery items",
			);

			expectDeepEqual(
				result.data.gallery,
				["product.jpg", "gallery1.jpg"],
				"Should preserve gallery array",
			);

			expectStrictEqual(
				result.data.title,
				item.data.title,
				"Should preserve other data",
			);
			expectStrictEqual(
				result,
				item,
				"Should return same object (mutated for Eleventy compatibility)",
			);
		},
	},
	{
		name: "addGallery-gallery-processing",
		description:
			"Processes gallery correctly while preserving object reference",
		test: () => {
			const originalItem = {
				data: {
					title: "Test Product",
					gallery: ["image.jpg"],
				},
			};
			const itemCopy = JSON.parse(JSON.stringify(originalItem));

			const result = addGallery(itemCopy);

			expectStrictEqual(
				result,
				itemCopy,
				"Should return same object reference",
			);
			expectDeepEqual(
				itemCopy.data.gallery,
				["image.jpg"],
				"Should preserve gallery array",
			);
		},
	},
	{
		name: "createProductsCollection-basic",
		description: "Creates products collection from API",
		test: () => {
			const mockProducts = [
				{ data: { title: "Product 1", gallery: ["img1.jpg"] } },
				{ data: { title: "Product 2" } },
				{ data: { title: "Product 3", gallery: ["img3.jpg"] } },
			];

			const mockCollectionApi = {
				getFilteredByTag: (tag) => {
					expectStrictEqual(tag, "product", "Should filter by product tag");
					return mockProducts;
				},
			};

			const result = createProductsCollection(mockCollectionApi);

			expectStrictEqual(result.length, 3, "Should return all products");
			expectDeepEqual(
				result[0].data.gallery,
				["img1.jpg"],
				"Should preserve first product gallery",
			);
			expectStrictEqual(
				result[1].data.gallery,
				undefined,
				"Should handle missing gallery",
			);
			expectDeepEqual(
				result[2].data.gallery,
				["img3.jpg"],
				"Should preserve third product gallery",
			);
		},
	},
	{
		name: "getProductsByCategory-basic",
		description: "Filters products by category",
		test: () => {
			const products = [
				{ data: { title: "Product 1", categories: ["widgets", "gadgets"] } },
				{ data: { title: "Product 2", categories: ["tools"] } },
				{ data: { title: "Product 3", categories: ["widgets"] } },
				{ data: { title: "Product 4" } },
			];

			const result = getProductsByCategory(products, "widgets");

			expectStrictEqual(
				result.length,
				2,
				"Should return 2 products in widgets category",
			);
			expectStrictEqual(
				result[0].data.title,
				"Product 1",
				"Should include first product",
			);
			expectStrictEqual(
				result[1].data.title,
				"Product 3",
				"Should include third product",
			);
		},
	},
	{
		name: "getProductsByCategory-no-categories",
		description: "Handles products without categories",
		test: () => {
			const products = [
				{ data: { title: "Product 1" } },
				{ data: { title: "Product 2", categories: null } },
				{ data: { title: "Product 3", categories: [] } },
			];

			const result = getProductsByCategory(products, "widgets");

			expectStrictEqual(
				result.length,
				0,
				"Should return no products when none have matching categories",
			);
		},
	},
	{
		name: "getReviewsByProduct-basic",
		description: "Filters reviews by product",
		test: () => {
			const reviews = [
				{ data: { title: "Review 1", products: ["product-a", "product-b"] } },
				{ data: { title: "Review 2", products: ["product-c"] } },
				{ data: { title: "Review 3", products: ["product-a"] } },
				{ data: { title: "Review 4" } },
			];

			const result = getReviewsByProduct(reviews, "product-a");

			expectStrictEqual(
				result.length,
				2,
				"Should return 2 reviews for product-a",
			);
			expectStrictEqual(
				result[0].data.title,
				"Review 1",
				"Should include first review",
			);
			expectStrictEqual(
				result[1].data.title,
				"Review 3",
				"Should include third review",
			);
		},
	},
	{
		name: "getReviewsByProduct-no-products",
		description: "Handles reviews without products",
		test: () => {
			const reviews = [
				{ data: { title: "Review 1" } },
				{ data: { title: "Review 2", products: null } },
				{ data: { title: "Review 3", products: [] } },
			];

			const result = getReviewsByProduct(reviews, "product-a");

			expectStrictEqual(
				result.length,
				0,
				"Should return no reviews when none have matching products",
			);
		},
	},
	{
		name: "createReviewsCollection-basic",
		description: "Creates reviews collection from API",
		test: () => {
			const mockReviews = [
				{ data: { name: "Review 1", rating: 5 } },
				{ data: { name: "Review 2", rating: 4 } },
			];

			const mockCollectionApi = {
				getFilteredByTag: (tag) => {
					expectStrictEqual(tag, "review", "Should filter by review tag");
					return mockReviews;
				},
			};

			const result = createReviewsCollection(mockCollectionApi);

			expectStrictEqual(result.length, 2, "Should return all reviews");
			expectStrictEqual(
				result[0].data.name,
				"Review 1",
				"Should include first review",
			);
			expectStrictEqual(
				result[1].data.name,
				"Review 2",
				"Should include second review",
			);
		},
	},
	{
		name: "createVisibleReviewsCollection-basic",
		description: "Creates visible reviews collection excluding hidden reviews",
		test: () => {
			const mockReviews = [
				{ data: { name: "Review 1", rating: 5 } },
				{ data: { name: "Review 2", rating: 4, hidden: true } },
				{ data: { name: "Review 3", rating: 5 } },
				{ data: { name: "Review 4", rating: 3, hidden: true } },
			];

			const mockCollectionApi = {
				getFilteredByTag: (tag) => {
					expectStrictEqual(tag, "review", "Should filter by review tag");
					return mockReviews;
				},
			};

			const result = createVisibleReviewsCollection(mockCollectionApi);

			expectStrictEqual(result.length, 2, "Should return only visible reviews");
			expectStrictEqual(
				result[0].data.name,
				"Review 1",
				"Should include first visible review",
			);
			expectStrictEqual(
				result[1].data.name,
				"Review 3",
				"Should include second visible review",
			);
		},
	},
	{
		name: "createVisibleReviewsCollection-no-hidden",
		description: "Returns all reviews when none are hidden",
		test: () => {
			const mockReviews = [
				{ data: { name: "Review 1", rating: 5 } },
				{ data: { name: "Review 2", rating: 4 } },
			];

			const mockCollectionApi = {
				getFilteredByTag: (tag) => {
					expectStrictEqual(tag, "review", "Should filter by review tag");
					return mockReviews;
				},
			};

			const result = createVisibleReviewsCollection(mockCollectionApi);

			expectStrictEqual(
				result.length,
				2,
				"Should return all reviews when none are hidden",
			);
			expectStrictEqual(
				result[0].data.name,
				"Review 1",
				"Should include first review",
			);
			expectStrictEqual(
				result[1].data.name,
				"Review 2",
				"Should include second review",
			);
		},
	},
	{
		name: "configureProducts-basic",
		description: "Configures products collection and filters",
		test: () => {
			const mockConfig = createMockEleventyConfig();

			configureProducts(mockConfig);

			expectFunctionType(
				mockConfig.collections,
				"products",
				"Should add products collection",
			);
			expectFunctionType(
				mockConfig.collections,
				"reviews",
				"Should add reviews collection",
			);
			expectFunctionType(
				mockConfig.collections,
				"visibleReviews",
				"Should add visibleReviews collection",
			);
			expectFunctionType(
				mockConfig.filters,
				"getProductsByCategory",
				"Should add getProductsByCategory filter",
			);
			expectFunctionType(
				mockConfig.filters,
				"getReviewsByProduct",
				"Should add getReviewsByProduct filter",
			);
			expectFunctionType(
				mockConfig.filters,
				"getFeaturedProducts",
				"Should add getFeaturedProducts filter",
			);

			expectStrictEqual(
				mockConfig.filters.getProductsByCategory,
				getProductsByCategory,
				"Should use correct filter function",
			);
			expectStrictEqual(
				mockConfig.filters.getReviewsByProduct,
				getReviewsByProduct,
				"Should use correct filter function",
			);
			expectStrictEqual(
				mockConfig.filters.getFeaturedProducts,
				getFeaturedProducts,
				"Should use correct filter function",
			);
		},
	},
	{
		name: "getFeaturedProducts-basic",
		description: "Filters products by featured flag",
		test: () => {
			const products = [
				{ data: { title: "Product 1", featured: true } },
				{ data: { title: "Product 2", featured: false } },
				{ data: { title: "Product 3", featured: true } },
				{ data: { title: "Product 4" } },
			];

			const result = getFeaturedProducts(products);

			expectStrictEqual(result.length, 2, "Should return 2 featured products");
			expectStrictEqual(
				result[0].data.title,
				"Product 1",
				"Should include first featured product",
			);
			expectStrictEqual(
				result[1].data.title,
				"Product 3",
				"Should include second featured product",
			);
		},
	},
	{
		name: "getFeaturedProducts-empty",
		description: "Returns empty array when no products are featured",
		test: () => {
			const products = [
				{ data: { title: "Product 1", featured: false } },
				{ data: { title: "Product 2" } },
			];

			const result = getFeaturedProducts(products);

			expectStrictEqual(
				result.length,
				0,
				"Should return no products when none are featured",
			);
		},
	},
	{
		name: "getFeaturedProducts-null",
		description: "Handles null/undefined products array",
		test: () => {
			expectDeepEqual(
				getFeaturedProducts(null),
				[],
				"Should return empty array for null",
			);
			expectDeepEqual(
				getFeaturedProducts(undefined),
				[],
				"Should return empty array for undefined",
			);
		},
	},
	{
		name: "filter-functions-immutable",
		description: "Filter functions should be pure and not modify inputs",
		test: () => {
			const originalProducts = [
				{ data: { title: "Product 1", categories: ["widgets"] } },
			];
			const originalReviews = [
				{ data: { title: "Review 1", products: ["product-1"] } },
			];

			const productsCopy = JSON.parse(JSON.stringify(originalProducts));
			const reviewsCopy = JSON.parse(JSON.stringify(originalReviews));

			getProductsByCategory(productsCopy, "widgets");
			getReviewsByProduct(reviewsCopy, "product-1");

			expectDeepEqual(
				productsCopy,
				originalProducts,
				"getProductsByCategory should not modify input",
			);
			expectDeepEqual(
				reviewsCopy,
				originalReviews,
				"getReviewsByProduct should not modify input",
			);
		},
	},
];

export default createTestRunner("products", testCases);
