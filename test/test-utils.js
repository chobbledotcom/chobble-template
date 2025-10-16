import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const createMockEleventyConfig = () => ({
  addPlugin: function(plugin, config) {
    this.pluginCalls = this.pluginCalls || [];
    this.pluginCalls.push({ plugin, config });
  },
  addCollection: function(name, fn) {
    this.collections = this.collections || {};
    this.collections[name] = fn;
  },
  addFilter: function(name, fn) {
    this.filters = this.filters || {};
    this.filters[name] = fn;
  },
  addShortcode: function(name, fn) {
    this.shortcodes = this.shortcodes || {};
    this.shortcodes[name] = fn;
  },
  addAsyncShortcode: function(name, fn) {
    this.asyncShortcodes = this.asyncShortcodes || {};
    this.asyncShortcodes[name] = fn;
  },
  addTemplateFormats: function(format) {
    this.templateFormats = this.templateFormats || [];
    this.templateFormats.push(format);
  },
  addExtension: function(ext, config) {
    this.extensions = this.extensions || {};
    this.extensions[ext] = config;
  },
  addTransform: function(name, fn) {
    this.transforms = this.transforms || {};
    this.transforms[name] = fn;
  },
  setLayoutsDirectory: function(dir) {
    this.layoutsDirectory = dir;
  },
  addWatchTarget: function(target) {
    this.watchTargets = this.watchTargets || [];
    this.watchTargets.push(target);
  },
  addPassthroughCopy: function(path) {
    this.passthroughCopies = this.passthroughCopies || [];
    this.passthroughCopies.push(path);
  }
});

const createTempDir = (testName, suffix = '') => {
  const dirName = `temp-${testName}${suffix ? '-' + suffix : ''}`;
  const tempDir = path.join(__dirname, dirName);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
};

const createTempFile = (dir, filename, content) => {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
};

const createTempSnippetsDir = (testName) => {
  const tempDir = createTempDir(testName);
  const snippetsDir = path.join(tempDir, 'src/snippets');
  fs.mkdirSync(snippetsDir, { recursive: true });
  return { tempDir, snippetsDir };
};

const cleanupTempDir = (tempDir) => {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

const withTempDir = (testName, callback) => {
  const tempDir = createTempDir(testName);
  try {
    return callback(tempDir);
  } finally {
    cleanupTempDir(tempDir);
  }
};

const withTempFile = (testName, filename, content, callback) => {
  return withTempDir(testName, (tempDir) => {
    const filePath = createTempFile(tempDir, filename, content);
    return callback(tempDir, filePath);
  });
};

const withMockedCwd = (newCwd, callback) => {
  const originalCwd = process.cwd;
  process.cwd = () => newCwd;
  try {
    return callback();
  } finally {
    process.cwd = originalCwd;
  }
};

const runTestSuite = async (testName, testCases) => {
  try {
    console.log(`=== Running ${testName} tests ===`);

    for (const testCase of testCases) {
      const testId = `${testName}/${testCase.name}`;
      
      try {
        if (testCase.test) {
          testCase.test();
        } else if (testCase.asyncTest) {
          await testCase.asyncTest();
        }
        console.log(`✅ PASS: ${testId} - ${testCase.description}`);
      } catch (error) {
        console.error(`❌ FAIL: ${testId} - ${testCase.description}`);
        console.error(`   Error: ${error.message}`);
        throw error;
      }
    }

    console.log(`\n✅ All ${testName} tests passed!`);
  } catch (error) {
    console.error(`❌ Test suite failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

const createTestRunner = (testName, testCases) => {
  const runTests = () => runTestSuite(testName, testCases);
  
  // Always run tests when module is loaded (for script execution)
  runTests();
  
  return { runTests };
};

const expectFunctionType = (obj, property, message) => {
  if (property === undefined) {
    // When property is undefined, we're checking if obj itself is a function
    assert.strictEqual(typeof obj, 'function', message || `Should be a function`);
  } else {
    assert.strictEqual(obj !== undefined && obj !== null, true, message || `Object should exist to check ${property}`);
    assert.strictEqual(typeof obj[property], 'function', message || `${property} should be a function`);
  }
};

const expectArrayLength = (arr, expectedLength, message) => {
  assert.strictEqual(arr.length, expectedLength, message || `Array should have length ${expectedLength}`);
};

const expectObjectProperty = (obj, property, expectedValue, message) => {
  assert.strictEqual(obj[property], expectedValue, message || `Property ${property} should equal ${expectedValue}`);
};

const expectDeepEqual = (actual, expected, message) => {
  assert.deepStrictEqual(actual, expected, message);
};

const expectStrictEqual = (actual, expected, message) => {
  assert.strictEqual(actual, expected, message);
};

const expectTrue = (value, message) => {
  assert.strictEqual(value, true, message);
};

const expectFalse = (value, message) => {
  assert.strictEqual(value, false, message);
};

const expectThrows = (fn, errorMatcher, message) => {
  assert.throws(fn, errorMatcher, message);
};

export {
  assert,
  fs,
  path,
  createMockEleventyConfig,
  createTempDir,
  createTempFile,
  createTempSnippetsDir,
  cleanupTempDir,
  withTempDir,
  withTempFile,
  withMockedCwd,
  runTestSuite,
  createTestRunner,
  expectFunctionType,
  expectArrayLength,
  expectObjectProperty,
  expectDeepEqual,
  expectStrictEqual,
  expectTrue,
  expectFalse,
  expectThrows,
};