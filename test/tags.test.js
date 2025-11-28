import {
	createMockEleventyConfig,
	createTestRunner,
	expectStrictEqual,
	expectDeepEqual,
	expectFunctionType,
	expectArrayLength,
} from "./test-utils.js";

import { extractTags, configureTags } from "../src/_lib/tags.js";

const testCases = [
	{
		name: "extractTags-basic",
		description: "Extracts unique tags from collection",
		test: () => {
			const collection = [
				{
					url: "/post1/",
					data: { tags: ["javascript", "web"] },
				},
				{
					url: "/post2/",
					data: { tags: ["javascript", "nodejs"] },
				},
				{
					url: "/post3/",
					data: { tags: ["web", "css"] },
				},
			];

			const result = extractTags(collection);

			expectArrayLength(result, 4, "Should return 4 unique tags");
			expectDeepEqual(
				result,
				["css", "javascript", "nodejs", "web"],
				"Should return sorted unique tags",
			);
		},
	},
	{
		name: "extractTags-empty-collection",
		description: "Handles empty collection",
		test: () => {
			const result = extractTags([]);

			expectArrayLength(
				result,
				0,
				"Should return empty array for empty collection",
			);
			expectDeepEqual(result, [], "Should return empty array");
		},
	},
	{
		name: "extractTags-no-tags",
		description: "Handles pages without tags",
		test: () => {
			const collection = [
				{
					url: "/page1/",
					data: {},
				},
				{
					url: "/page2/",
					data: { title: "Page 2" },
				},
			];

			const result = extractTags(collection);

			expectArrayLength(
				result,
				0,
				"Should return empty array when no tags exist",
			);
		},
	},
	{
		name: "extractTags-null-undefined-tags",
		description: "Handles null and undefined tags gracefully",
		test: () => {
			const collection = [
				{
					url: "/post1/",
					data: { tags: null },
				},
				{
					url: "/post2/",
					data: { tags: undefined },
				},
				{
					url: "/post3/",
					data: { tags: ["javascript"] },
				},
			];

			const result = extractTags(collection);

			expectArrayLength(result, 1, "Should handle null/undefined tags");
			expectDeepEqual(result, ["javascript"], "Should return only valid tags");
		},
	},
	{
		name: "extractTags-empty-and-whitespace-tags",
		description: "Filters out empty and whitespace-only tags",
		test: () => {
			const collection = [
				{
					url: "/post1/",
					data: { tags: ["javascript", "", "  ", "web", "   \t  "] },
				},
			];

			const result = extractTags(collection);

			expectArrayLength(result, 2, "Should filter out empty/whitespace tags");
			expectDeepEqual(
				result,
				["javascript", "web"],
				"Should return only non-empty tags",
			);
		},
	},
	{
		name: "extractTags-duplicates",
		description: "Removes duplicate tags",
		test: () => {
			const collection = [
				{
					url: "/post1/",
					data: { tags: ["javascript", "web"] },
				},
				{
					url: "/post2/",
					data: { tags: ["javascript", "web", "javascript"] },
				},
			];

			const result = extractTags(collection);

			expectArrayLength(result, 2, "Should remove duplicates");
			expectDeepEqual(
				result,
				["javascript", "web"],
				"Should return unique tags",
			);
		},
	},
	{
		name: "extractTags-sorted",
		description: "Returns tags in sorted order",
		test: () => {
			const collection = [
				{
					url: "/post1/",
					data: { tags: ["zebra", "apple", "banana"] },
				},
			];

			const result = extractTags(collection);

			expectDeepEqual(
				result,
				["apple", "banana", "zebra"],
				"Should return tags in alphabetical order",
			);
		},
	},
	{
		name: "extractTags-filters-no-url",
		description: "Filters out pages without URL",
		test: () => {
			const collection = [
				{
					data: { tags: ["hidden"] },
				},
				{
					url: "/visible/",
					data: { tags: ["visible"] },
				},
			];

			const result = extractTags(collection);

			expectArrayLength(result, 1, "Should filter out pages without URL");
			expectDeepEqual(
				result,
				["visible"],
				"Should only include pages with URL",
			);
		},
	},
	{
		name: "extractTags-filters-no-index",
		description: "Filters out pages marked as no_index",
		test: () => {
			const collection = [
				{
					url: "/indexed/",
					data: { tags: ["indexed"] },
				},
				{
					url: "/not-indexed/",
					data: { tags: ["hidden"], no_index: true },
				},
			];

			const result = extractTags(collection);

			expectArrayLength(result, 1, "Should filter out no_index pages");
			expectDeepEqual(result, ["indexed"], "Should only include indexed pages");
		},
	},
	{
		name: "extractTags-mixed-data-types",
		description: "Handles mixed data scenarios",
		test: () => {
			const collection = [
				{
					url: "/post1/",
					data: { tags: ["valid"] },
				},
				{
					url: "/post2/",
					data: { tags: ["another"], no_index: false },
				},
				{
					url: "/post3/",
					data: { tags: ["hidden"], no_index: true },
				},
				{
					// No data property
					url: "/post4/",
				},
				{
					data: { tags: ["no-url"] },
					// No url property
				},
			];

			const result = extractTags(collection);

			expectArrayLength(result, 2, "Should handle mixed scenarios correctly");
			expectDeepEqual(
				result,
				["another", "valid"],
				"Should return only tags from valid, indexed pages",
			);
		},
	},
	{
		name: "extractTags-array-handling",
		description: "Properly flattens tag arrays",
		test: () => {
			const collection = [
				{
					url: "/post1/",
					data: { tags: ["tag1", "tag2"] },
				},
				{
					url: "/post2/",
					data: { tags: ["tag3"] },
				},
				{
					url: "/post3/",
					data: { tags: [] },
				},
			];

			const result = extractTags(collection);

			expectArrayLength(result, 3, "Should flatten all tag arrays");
			expectDeepEqual(
				result,
				["tag1", "tag2", "tag3"],
				"Should properly flatten and sort tags",
			);
		},
	},
	{
		name: "configureTags-basic",
		description: "Configures tags filter in Eleventy",
		test: () => {
			const mockConfig = createMockEleventyConfig();

			configureTags(mockConfig);

			expectFunctionType(mockConfig.filters, "tags", "Should add tags filter");
			expectStrictEqual(
				mockConfig.filters.tags,
				extractTags,
				"Should use correct filter function",
			);
		},
	},
	{
		name: "configureTags-filter-works",
		description: "Configured filter works correctly",
		test: () => {
			const mockConfig = createMockEleventyConfig();
			configureTags(mockConfig);

			const collection = [
				{
					url: "/test/",
					data: { tags: ["test-tag"] },
				},
			];

			const result = mockConfig.filters.tags(collection);

			expectArrayLength(result, 1, "Filter should work");
			expectDeepEqual(result, ["test-tag"], "Should return correct tags");
		},
	},
	{
		name: "extractTags-functional-immutability",
		description: "Function does not modify input collection",
		test: () => {
			const originalCollection = [
				{
					url: "/post1/",
					data: { tags: ["original"], title: "Test" },
				},
			];

			const collectionCopy = JSON.parse(JSON.stringify(originalCollection));

			extractTags(collectionCopy);

			expectDeepEqual(
				collectionCopy,
				originalCollection,
				"Should not modify input collection",
			);
		},
	},
	{
		name: "extractTags-edge-cases-with-numbers",
		description: "Handles various edge cases including numbers",
		test: () => {
			const collection = [
				{
					url: "/post1/",
					data: { tags: ["  spaced  ", "normal"] },
				},
				{
					url: "/post2/",
					data: { tags: [123, 0, "text"] },
				},
				{
					url: "/post3/",
					data: { tags: ["", null, undefined, "valid"] },
				},
			];

			const result = extractTags(collection);

			expectDeepEqual(
				result,
				["0", "123", "normal", "spaced", "text", "valid"],
				"Should convert numbers to strings and handle edge cases",
			);
			expectStrictEqual(
				result.every((tag) => typeof tag === "string"),
				true,
				"Should only return strings",
			);
		},
	},
];

export default createTestRunner("tags", testCases);
