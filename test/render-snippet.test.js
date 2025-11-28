import assert from "assert";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import markdownIt from "markdown-it";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const md = new markdownIt({ html: true });

// Test suite configuration
const TEST_NAME = "render_snippet";
const testDir = path.join(__dirname, "test-snippets");
const snippetsDir = path.join(testDir, "src/snippets");

// Test case definitions
const testCases = [
  {
    name: "with-frontmatter",
    description: "Snippet with frontmatter",
    content: `---
title: Test Title
layout: page
---
# Heading
Content after frontmatter`,
    expectedResult: "# Heading\nContent after frontmatter",
  },
  {
    name: "without-frontmatter",
    description: "Snippet without frontmatter",
    content: `# Heading Only
This is content without any frontmatter`,
    expectedResult: null, // null means use the original content
  },
  {
    name: "empty",
    description: "Empty snippet",
    content: "",
    expectedResult: "",
  },
  {
    name: "only-frontmatter",
    description: "Snippet with only frontmatter",
    content: `---
title: Only Frontmatter
layout: page
---`,
    expectedResult: "",
  },
  {
    name: "malformed-frontmatter",
    description: "Snippet with malformed frontmatter",
    content: `---
title: Malformed
layout: page
# Heading
Content with malformed frontmatter`,
    expectedResult: null, // null means use the original content
  },
  {
    name: "non-existent",
    description: "Non-existent snippet file",
    content: null, // No file will be created
    defaultValue: "Default content",
    expectedResult: "Default content",
  },
];

// Create a mock eleventyConfig for testing
const mockConfig = {
  addWatchTarget: () => {},
  addPassthroughCopy: () => mockConfig,
  addPlugin: () => {},
  addAsyncShortcode: (name, fn) => {
    mockConfig[name] = fn;
  },
  addTransform: () => {},
  on: () => {},
  addCollection: () => {},
  addFilter: () => {},
  addAsyncFilter: () => {},
  addShortcode: (name, fn) => {
    mockConfig[name] = fn;
  },
  addTemplateFormats: () => {},
  addExtension: () => {},
  setLayoutsDirectory: () => {},
  addGlobalData: () => {},
  addLayoutAlias: () => {},
  render_snippet: null,
  resolvePlugin: (pluginName) => {
    // Return a mock plugin function
    return function mockPlugin() {};
  },
  pathPrefix: "/",
};

// Setup and run tests
async function runTests() {
  try {
    // Create test directories
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    if (!fs.existsSync(snippetsDir)) {
      fs.mkdirSync(snippetsDir, { recursive: true });
    }

    // Create test files
    testCases.forEach((testCase) => {
      if (testCase.content !== null) {
        fs.writeFileSync(
          path.join(snippetsDir, `${testCase.name}.md`),
          testCase.content,
        );
      }
    });

    // Patch process.cwd() for testing
    const originalCwd = process.cwd;
    process.cwd = () => testDir;

    try {
      // Import and initialize the eleventy config with our mock
      const eleventyConfigModule = await import("../.eleventy.js");
      const eleventyConfig = eleventyConfigModule.default;
      await eleventyConfig(mockConfig);

      console.log(`=== Running ${TEST_NAME} tests ===`);

      // Run each test case
      for (const testCase of testCases) {
        const testId = `${TEST_NAME}/${testCase.name}`;
        const defaultValue = testCase.defaultValue || "";

        const result = await mockConfig.render_snippet(
          testCase.name,
          defaultValue,
        );
        let expected;

        if (testCase.name === "non-existent") {
          // For non-existent files, the default string is returned directly without markdown rendering
          expected = defaultValue;
        } else if (testCase.expectedResult === null) {
          // Use original content if expectedResult is null
          expected = md.render(testCase.content);
        } else {
          expected =
            testCase.expectedResult === ""
              ? md.render("")
              : md.render(testCase.expectedResult);
        }

        assert.strictEqual(
          result,
          expected,
          `${testId} failed: ${testCase.description}`,
        );
        console.log(`✅ PASS: ${testId} - ${testCase.description}`);
      }

      console.log(`\n✅ All ${TEST_NAME} tests passed!`);
    } finally {
      // Restore original cwd
      process.cwd = originalCwd;
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

runTests();
