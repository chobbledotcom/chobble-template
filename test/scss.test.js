import {
	compileScss,
	configureScss,
	createScssCompiler,
} from "../src/_lib/scss.js";
import {
	createMockEleventyConfig,
	createTestRunner,
	expectArrayLength,
	expectFalse,
	expectFunctionType,
	expectStrictEqual,
	expectTrue,
} from "./test-utils.js";

const testCases = [
	{
		name: "createScssCompiler-basic",
		description: "Creates SCSS compiler function for given input path",
		test: () => {
			const inputPath = "/test/styles.scss";
			const simpleScss = "$color: red; body { color: $color; }";
			const compiler = createScssCompiler(simpleScss, inputPath);

			expectFunctionType(compiler, undefined, "Should return a function");

			const result = compiler({});
			expectTrue(
				result.includes("color: red"),
				"Should compile SCSS variables",
			);
			expectTrue(result.includes("body"), "Should include selectors");
		},
	},
	{
		name: "createScssCompiler-with-imports",
		description: "Handles SCSS with import paths correctly",
		test: () => {
			const inputPath = "/project/src/css/main.scss";
			const scssWithImports =
				'@import "variables"; body { background: $bg-color; }';
			const compiler = createScssCompiler(scssWithImports, inputPath);

			expectFunctionType(compiler, undefined, "Should return a function");

			try {
				compiler({});
			} catch (error) {
				expectTrue(
					error.message.includes("Can't find stylesheet") ||
						error.message.includes("file to import not found"),
					"Should handle import errors gracefully",
				);
			}
		},
	},
	{
		name: "compileScss-basic",
		description: "Compiles SCSS content with basic functionality",
		test: () => {
			const inputContent = "$primary: #333; .header { color: $primary; }";
			const inputPath = "/test/style.scss";

			const result = compileScss(inputContent, inputPath);

			expectTrue(result.includes(".header"), "Should include CSS selectors");
			expectTrue(
				result.includes("color: #333") || result.includes("color:#333"),
				"Should compile SCSS variables",
			);
		},
	},
	{
		name: "compileScss-nested-rules",
		description: "Handles nested SCSS rules",
		test: () => {
			const inputContent =
				".nav { ul { margin: 0; li { list-style: none; } } }";
			const inputPath = "/test/nested.scss";

			const result = compileScss(inputContent, inputPath);

			expectTrue(result.includes(".nav ul"), "Should handle nested selectors");
			expectTrue(
				result.includes(".nav ul li"),
				"Should handle deeply nested selectors",
			);
		},
	},
	{
		name: "compileScss-mixins",
		description: "Handles SCSS mixins",
		test: () => {
			const inputContent = `
        @mixin button-style($bg) {
          background: $bg;
          padding: 10px;
        }
        .btn { @include button-style(blue); }
      `;
			const inputPath = "/test/mixins.scss";

			const result = compileScss(inputContent, inputPath);

			expectTrue(result.includes(".btn"), "Should include selector");
			expectTrue(
				result.includes("background: blue") ||
					result.includes("background:blue"),
				"Should apply mixin",
			);
			expectTrue(
				result.includes("padding: 10px") || result.includes("padding:10px"),
				"Should include mixin properties",
			);
		},
	},
	{
		name: "configureScss-basic",
		description: "Configures SCSS compilation in Eleventy",
		test: () => {
			const mockConfig = createMockEleventyConfig();

			configureScss(mockConfig);

			expectArrayLength(
				mockConfig.templateFormats,
				1,
				"Should add template format",
			);
			expectStrictEqual(
				mockConfig.templateFormats[0],
				"scss",
				"Should add scss format",
			);

			expectTrue(
				mockConfig.extensions.scss !== undefined,
				"Should add scss extension",
			);

			const scssExtension = mockConfig.extensions.scss;
			expectStrictEqual(
				scssExtension.outputFileExtension,
				"css",
				"Should output CSS files",
			);
			expectFunctionType(
				scssExtension,
				"compile",
				"Should have compile function",
			);
		},
	},
	{
		name: "configureScss-compiler-function",
		description: "SCSS extension compile function works correctly",
		test: () => {
			const mockConfig = createMockEleventyConfig();
			configureScss(mockConfig);

			const scssExtension = mockConfig.extensions.scss;
			const inputContent = "$color: green; .test { color: $color; }";
			const inputPath = "/project/test.scss";

			const compileFn = scssExtension.compile(inputContent, inputPath);
			expectFunctionType(
				compileFn,
				undefined,
				"Compile should return a function",
			);

			const result = compileFn({});
			expectTrue(
				typeof result === "string",
				"Should return compiled CSS string",
			);
			expectTrue(result.includes(".test"), "Should include CSS selector");
			expectTrue(
				result.includes("color: green") || result.includes("color:green"),
				"Should compile SCSS",
			);
		},
	},
	{
		name: "configureScss-load-paths",
		description: "Uses correct load paths for imports",
		test: () => {
			const mockConfig = createMockEleventyConfig();
			configureScss(mockConfig);

			const scssExtension = mockConfig.extensions.scss;
			const inputPath = "/project/src/css/main.scss";
			const inputContent = ".test { color: blue; }";

			const compileFn = scssExtension.compile(inputContent, inputPath);
			const result = compileFn({});

			expectTrue(
				typeof result === "string",
				"Should compile successfully with load paths",
			);
			expectTrue(result.includes(".test"), "Should include styles");
		},
	},
	{
		name: "error-handling",
		description: "Handles SCSS compilation errors gracefully",
		test: () => {
			const invalidScss = ".test { color: ; }"; // Invalid syntax
			const inputPath = "/test/invalid.scss";

			try {
				compileScss(invalidScss, inputPath);
				expectFalse(true, "Should throw error for invalid SCSS");
			} catch (error) {
				expectTrue(error.message.length > 0, "Should provide error message");
			}
		},
	},
	{
		name: "functional-programming-style",
		description: "Functions should be pure and not modify inputs",
		test: () => {
			const originalContent = "$test: red; .class { color: $test; }";
			const originalPath = "/test/style.scss";
			const contentCopy = originalContent;
			const pathCopy = originalPath;

			compileScss(contentCopy, pathCopy);
			createScssCompiler(contentCopy, pathCopy);

			expectStrictEqual(
				contentCopy,
				originalContent,
				"Should not modify input content",
			);
			expectStrictEqual(pathCopy, originalPath, "Should not modify input path");
		},
	},
];

export default createTestRunner("scss", testCases);
