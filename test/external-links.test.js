import {
	createMockEleventyConfig,
	createTestRunner,
	expectStrictEqual,
	expectFunctionType,
	expectTrue,
	expectFalse,
} from "./test-utils.js";

import {
	isExternalUrl,
	getExternalLinkAttributes,
	externalLinkFilter,
	transformExternalLinks,
	createExternalLinksTransform,
	configureExternalLinks,
} from "../src/_lib/external-links.js";

const testCases = [
	{
		name: "isExternalUrl-http",
		description: "Detects HTTP URLs as external",
		test: () => {
			const result = isExternalUrl("http://example.com");
			expectTrue(result, "Should return true for HTTP URLs");
		},
	},
	{
		name: "isExternalUrl-https",
		description: "Detects HTTPS URLs as external",
		test: () => {
			const result = isExternalUrl("https://example.com");
			expectTrue(result, "Should return true for HTTPS URLs");
		},
	},
	{
		name: "isExternalUrl-relative",
		description: "Detects relative URLs as internal",
		test: () => {
			const result = isExternalUrl("/about");
			expectFalse(result, "Should return false for relative URLs");
		},
	},
	{
		name: "isExternalUrl-absolute-path",
		description: "Detects absolute paths as internal",
		test: () => {
			const result = isExternalUrl("/pages/about");
			expectFalse(result, "Should return false for absolute paths");
		},
	},
	{
		name: "isExternalUrl-hash",
		description: "Detects hash links as internal",
		test: () => {
			const result = isExternalUrl("#section");
			expectFalse(result, "Should return false for hash links");
		},
	},
	{
		name: "isExternalUrl-mailto",
		description: "Detects mailto links as internal",
		test: () => {
			const result = isExternalUrl("mailto:test@example.com");
			expectFalse(result, "Should return false for mailto links");
		},
	},
	{
		name: "isExternalUrl-null",
		description: "Handles null input gracefully",
		test: () => {
			const result = isExternalUrl(null);
			expectFalse(result, "Should return false for null");
		},
	},
	{
		name: "isExternalUrl-undefined",
		description: "Handles undefined input gracefully",
		test: () => {
			const result = isExternalUrl(undefined);
			expectFalse(result, "Should return false for undefined");
		},
	},
	{
		name: "isExternalUrl-empty-string",
		description: "Handles empty string gracefully",
		test: () => {
			const result = isExternalUrl("");
			expectFalse(result, "Should return false for empty string");
		},
	},
	{
		name: "isExternalUrl-non-string",
		description: "Handles non-string input gracefully",
		test: () => {
			const result1 = isExternalUrl(123);
			expectFalse(result1, "Should return false for number");

			const result2 = isExternalUrl({ url: "http://example.com" });
			expectFalse(result2, "Should return false for object");

			const result3 = isExternalUrl(["http://example.com"]);
			expectFalse(result3, "Should return false for array");
		},
	},
	{
		name: "getExternalLinkAttributes-disabled",
		description: "Returns empty string when config flag is false",
		test: () => {
			const config = { externalLinksTargetBlank: false };
			const result = getExternalLinkAttributes("https://example.com", config);
			expectStrictEqual(
				result,
				"",
				"Should return empty string when flag is false",
			);
		},
	},
	{
		name: "getExternalLinkAttributes-enabled",
		description: "Returns target and rel attributes when config flag is true",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const result = getExternalLinkAttributes("https://example.com", config);
			expectStrictEqual(
				result,
				' target="_blank" rel="noopener noreferrer"',
				"Should return target and rel attributes when flag is true",
			);
		},
	},
	{
		name: "getExternalLinkAttributes-internal-link",
		description: "Returns empty string for internal links regardless of config",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const result = getExternalLinkAttributes("/about", config);
			expectStrictEqual(
				result,
				"",
				"Should return empty string for internal links",
			);
		},
	},
	{
		name: "getExternalLinkAttributes-no-config",
		description: "Handles missing config gracefully",
		test: () => {
			const result = getExternalLinkAttributes("https://example.com", null);
			expectStrictEqual(
				result,
				"",
				"Should return empty string when config is null",
			);
		},
	},
	{
		name: "getExternalLinkAttributes-undefined-config",
		description: "Handles undefined config gracefully",
		test: () => {
			const result = getExternalLinkAttributes(
				"https://example.com",
				undefined,
			);
			expectStrictEqual(
				result,
				"",
				"Should return empty string when config is undefined",
			);
		},
	},
	{
		name: "getExternalLinkAttributes-http-enabled",
		description: "Works with HTTP URLs when enabled",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const result = getExternalLinkAttributes("http://example.com", config);
			expectStrictEqual(
				result,
				' target="_blank" rel="noopener noreferrer"',
				"Should work with HTTP URLs",
			);
		},
	},
	{
		name: "externalLinkFilter-basic",
		description: "externalLinkFilter delegates to getExternalLinkAttributes",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const result = externalLinkFilter("https://example.com", config);
			expectStrictEqual(
				result,
				' target="_blank" rel="noopener noreferrer"',
				"Should delegate to getExternalLinkAttributes",
			);
		},
	},
	{
		name: "transformExternalLinks-disabled",
		description: "Returns content unchanged when config flag is false",
		test: () => {
			const config = { externalLinksTargetBlank: false };
			const html = '<a href="https://example.com">Link</a>';
			const result = transformExternalLinks(html, config);
			expectStrictEqual(
				result,
				html,
				"Should return unchanged HTML when disabled",
			);
		},
	},
	{
		name: "transformExternalLinks-no-links",
		description: "Returns content unchanged when no links present",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const html = "<p>No links here</p>";
			const result = transformExternalLinks(html, config);
			expectStrictEqual(
				result,
				html,
				"Should return unchanged HTML when no links",
			);
		},
	},
	{
		name: "transformExternalLinks-external-link",
		description: "Adds target and rel to external links",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const html =
				'<html><body><a href="https://example.com">Link</a></body></html>';
			const result = transformExternalLinks(html, config);

			expectTrue(
				result.includes('target="_blank"'),
				"Should add target attribute",
			);
			expectTrue(
				result.includes('rel="noopener noreferrer"'),
				"Should add rel attribute",
			);
		},
	},
	{
		name: "transformExternalLinks-internal-link",
		description: "Does not modify internal links",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const html = '<html><body><a href="/about">About</a></body></html>';
			const result = transformExternalLinks(html, config);

			expectFalse(
				result.includes('target="_blank"'),
				"Should not add target to internal links",
			);
		},
	},
	{
		name: "transformExternalLinks-mixed-links",
		description: "Handles mix of external and internal links",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const html =
				'<html><body><a href="https://example.com">External</a><a href="/about">Internal</a></body></html>';
			const result = transformExternalLinks(html, config);

			expectTrue(
				result.includes('href="https://example.com"'),
				"Should preserve external URL",
			);
			expectTrue(
				result.includes('href="/about"'),
				"Should preserve internal URL",
			);
			expectTrue(
				result.includes('target="_blank"'),
				"Should add target to external link",
			);
		},
	},
	{
		name: "transformExternalLinks-preserves-existing-attributes",
		description: "Preserves other link attributes",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const html =
				'<html><body><a href="https://example.com" class="button" id="link1">Link</a></body></html>';
			const result = transformExternalLinks(html, config);

			expectTrue(result.includes('class="button"'), "Should preserve class");
			expectTrue(result.includes('id="link1"'), "Should preserve id");
		},
	},
	{
		name: "transformExternalLinks-http-and-https",
		description: "Handles both HTTP and HTTPS URLs",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const html =
				'<html><body><a href="http://example.com">HTTP</a><a href="https://example.com">HTTPS</a></body></html>';
			const result = transformExternalLinks(html, config);

			const targetCount = (result.match(/target="_blank"/g) || []).length;
			expectStrictEqual(
				targetCount,
				2,
				"Should add target to both HTTP and HTTPS links",
			);
		},
	},
	{
		name: "transformExternalLinks-null-content",
		description: "Handles null content gracefully",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const result = transformExternalLinks(null, config);
			expectStrictEqual(result, null, "Should return null for null content");
		},
	},
	{
		name: "transformExternalLinks-empty-content",
		description: "Handles empty content gracefully",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const result = transformExternalLinks("", config);
			expectStrictEqual(result, "", "Should return empty string");
		},
	},
	{
		name: "createExternalLinksTransform-basic",
		description: "Creates transform function",
		test: () => {
			const config = { externalLinksTargetBlank: false };
			const transform = createExternalLinksTransform(config);

			expectFunctionType(
				transform,
				undefined,
				"Should return a transform function",
			);
		},
	},
	{
		name: "createExternalLinksTransform-html-only",
		description: "Only processes HTML files",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const transform = createExternalLinksTransform(config);

			const cssContent = "body { color: red; }";
			const result = transform(cssContent, "style.css");
			expectStrictEqual(
				result,
				cssContent,
				"Should not process non-HTML files",
			);
		},
	},
	{
		name: "createExternalLinksTransform-skip-feeds",
		description: "Skips feed files",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const transform = createExternalLinksTransform(config);

			const feedContent = '<a href="https://example.com">Link</a>';
			const result = transform(feedContent, "feed.xml");
			expectStrictEqual(result, feedContent, "Should skip feed files");
		},
	},
	{
		name: "createExternalLinksTransform-processes-html",
		description: "Processes HTML files",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const transform = createExternalLinksTransform(config);

			const html =
				'<html><body><a href="https://example.com">Link</a></body></html>';
			const result = transform(html, "index.html");

			expectTrue(
				result.includes('target="_blank"'),
				"Should process HTML files",
			);
		},
	},
	{
		name: "configureExternalLinks-basic",
		description: "Adds externalLinkAttrs filter to Eleventy config",
		asyncTest: async () => {
			const mockConfig = createMockEleventyConfig();
			await configureExternalLinks(mockConfig);

			expectFunctionType(
				mockConfig.filters,
				"externalLinkAttrs",
				"Should add externalLinkAttrs filter",
			);
		},
	},
	{
		name: "configureExternalLinks-adds-transform",
		description: "Adds HTML transform to Eleventy config",
		asyncTest: async () => {
			const mockConfig = createMockEleventyConfig();
			await configureExternalLinks(mockConfig);

			expectFunctionType(
				mockConfig.transforms,
				"externalLinks",
				"Should add externalLinks transform",
			);
		},
	},
	{
		name: "configureExternalLinks-filter-works",
		description: "Configured filter uses loaded config",
		asyncTest: async () => {
			const mockConfig = createMockEleventyConfig();
			await configureExternalLinks(mockConfig);

			expectFunctionType(
				mockConfig.filters,
				"externalLinkAttrs",
				"Should have externalLinkAttrs filter",
			);

			const result = mockConfig.filters.externalLinkAttrs(
				"https://example.com",
			);
			expectStrictEqual(
				typeof result,
				"string",
				"Filter should return a string",
			);
		},
	},
	{
		name: "edge-case-url-with-spaces",
		description: "Handles URLs with spaces",
		test: () => {
			const result = isExternalUrl("https://example.com/path with spaces");
			expectTrue(result, "Should still detect as external URL");
		},
	},
	{
		name: "edge-case-url-with-query-params",
		description: "Handles URLs with query parameters",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const result = getExternalLinkAttributes(
				"https://example.com?foo=bar&baz=qux",
				config,
			);
			expectStrictEqual(
				result,
				' target="_blank" rel="noopener noreferrer"',
				"Should work with query parameters",
			);
		},
	},
	{
		name: "edge-case-url-with-fragment",
		description: "Handles external URLs with fragments",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const result = getExternalLinkAttributes(
				"https://example.com#section",
				config,
			);
			expectStrictEqual(
				result,
				' target="_blank" rel="noopener noreferrer"',
				"Should work with fragments",
			);
		},
	},
	{
		name: "security-rel-attribute",
		description: "Always includes rel attribute with noopener and noreferrer",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const result = getExternalLinkAttributes("https://example.com", config);

			expectTrue(
				result.includes('rel="noopener noreferrer"'),
				"Should include rel attribute with noopener and noreferrer",
			);
		},
	},
	{
		name: "pure-function-test",
		description: "Functions should be pure and not modify inputs",
		test: () => {
			const config = { externalLinksTargetBlank: true };
			const configCopy = JSON.parse(JSON.stringify(config));

			getExternalLinkAttributes("https://example.com", config);

			expectStrictEqual(
				JSON.stringify(config),
				JSON.stringify(configCopy),
				"Should not modify config object",
			);
		},
	},
];

export default createTestRunner("external-links", testCases);
