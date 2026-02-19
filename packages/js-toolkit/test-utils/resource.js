/**
 * Resource management utilities for tests
 *
 * Implements the bracket pattern for safe setup/teardown of test resources.
 */
import fs from "node:fs";
import path from "node:path";

/**
 * Bracket pattern for resource management.
 * Curried: (setup, teardown, passResource) => (arg, callback) => result
 *
 * Implements: acquire resource, use it, release it.
 * Uses try-finally to ensure teardown runs even if callback throws.
 *
 * @param {Function} setup - (arg) => resource - Acquire the resource
 * @param {Function} teardown - (resource) => void - Release the resource
 * @param {boolean} passResource - Whether to pass resource to callback
 * @returns {Function} (arg, callback) => result
 */
const runBracketCore =
  (setup, teardown, passResource, runCallback) => (arg, callback) => {
    const resource = setup(arg);
    try {
      const invoke = passResource ? () => callback(resource) : () => callback();
      return runCallback(invoke);
    } finally {
      teardown(resource);
    }
  };

const bracket = (setup, teardown, passResource = true) =>
  runBracketCore(setup, teardown, passResource, (invoke) => invoke());

const runBracketAsyncCore =
  (setup, teardown, passResource) => async (arg, callback) => {
    const resource = setup(arg);
    try {
      const invoke = passResource ? () => callback(resource) : () => callback();
      return await invoke();
    } finally {
      teardown(resource);
    }
  };

/**
 * Async bracket pattern for resource management.
 * Same as bracket but properly awaits async callbacks before teardown.
 *
 * @param {Function} setup - (arg) => resource - Acquire the resource
 * @param {Function} teardown - (resource) => void - Release the resource
 * @param {boolean} passResource - Whether to pass resource to callback
 * @returns {Function} async (arg, callback) => result
 */
const bracketAsync = (setup, teardown, passResource = true) =>
  runBracketAsyncCore(setup, teardown, passResource);

/**
 * Create a unique temporary directory for tests
 * @param {string} testName - Name to include in directory name
 * @param {string} [suffix] - Optional suffix
 * @returns {string} Path to created directory
 */
const createTempDir = (testName, suffix = "") => {
  const uniqueId = `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 9)}`;
  const dirName = `temp-${testName}${suffix ? `-${suffix}` : ""}-${uniqueId}`;
  // Use OS temp directory for better isolation
  const tempDir = path.join(process.cwd(), "test", dirName);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
};

/**
 * Create a file in a directory
 * @param {string} dir - Directory path
 * @param {string} filename - File name
 * @param {string} content - File content
 * @returns {string} Path to created file
 */
const createTempFile = (dir, filename, content) => {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
};

/**
 * Remove a temporary directory and all contents
 * @param {string} tempDir - Directory to remove
 */
const cleanupTempDir = (tempDir) => {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

// Bracket-based resource management using curried factory
const withTempDir = bracket(createTempDir, cleanupTempDir);

// Async version for use with async test functions
const withTempDirAsync = bracketAsync(createTempDir, cleanupTempDir);

/**
 * Create a temp file and run callback, cleaning up after
 * @param {string} testName - Test name for temp directory
 * @param {string} filename - File to create
 * @param {string} content - File content
 * @param {Function} callback - (tempDir, filePath) => result
 * @returns {any} Result of callback
 */
const withTempFile = (testName, filename, content, callback) =>
  withTempDir(testName, (tempDir) => {
    const filePath = createTempFile(tempDir, filename, content);
    return callback(tempDir, filePath);
  });

// Shared setup/teardown for mocking process.cwd
const mockCwdSetup = (newCwd) => {
  const original = process.cwd;
  process.cwd = () => newCwd;
  return original;
};

const mockCwdTeardown = (original) => {
  process.cwd = original;
};

const withMockedCwd = bracket(mockCwdSetup, mockCwdTeardown, false);
const withMockedCwdAsync = bracketAsync(mockCwdSetup, mockCwdTeardown, false);

const withMockedProcessExit = bracket(
  () => {
    const original = process.exit;
    process.exit = () => {
      // no-op: mock to prevent actual process exit
    };
    return original;
  },
  (original) => {
    process.exit = original;
  },
  false,
);

/**
 * Create a temp directory with a specific subdirectory structure.
 * Manual version - returns cleanup function for explicit control.
 *
 * @param {string} testName - Unique name for the temp directory
 * @param {string} subPath - Subdirectory path to create (e.g., "src/assets/icons")
 * @returns {{ tempDir: string, subDir: string, cleanup: () => void }}
 */
const withSubDir = (testName, subPath = "") => {
  const tempDir = createTempDir(testName);
  const subDir = subPath ? path.join(tempDir, subPath) : tempDir;
  if (subPath) {
    fs.mkdirSync(subDir, { recursive: true });
  }
  return { tempDir, subDir, cleanup: () => cleanupTempDir(tempDir) };
};

/**
 * Bracket-based temp directory with subdirectory.
 * Automatically cleans up after callback completes.
 *
 * @param {string} testName - Unique name for the temp directory
 * @param {string} subPath - Subdirectory path to create
 * @param {Function} callback - ({ tempDir, subDir }) => result
 * @returns {Promise<any>} Result of callback
 *
 * @example
 * await withSubDirAsync("my-test", "src/assets/icons", async ({ tempDir, subDir }) => {
 *   fs.writeFileSync(path.join(subDir, "icon.svg"), svg);
 *   const result = await myFunction(tempDir);
 *   expect(result).toBe(expected);
 * });
 */
const withSubDirAsync = async (testName, subPath, callback) => {
  const { tempDir, subDir, cleanup } = withSubDir(testName, subPath);
  try {
    return await callback({ tempDir, subDir });
  } finally {
    cleanup();
  }
};

export {
  bracket,
  bracketAsync,
  createTempDir,
  createTempFile,
  cleanupTempDir,
  withTempDir,
  withTempDirAsync,
  withTempFile,
  withMockedCwd,
  withMockedCwdAsync,
  withMockedProcessExit,
  withSubDir,
  withSubDirAsync,
};
