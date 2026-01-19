/**
 * Test utilities
 *
 * @example
 * import { withTempDir, expectProp, mockFetch } from "@chobble/js-toolkit/test-utils";
 */

// Assertions
export {
  expectArrayProp,
  expectAsyncThrows,
  expectDataArray,
  expectErrorsInclude,
  expectObjectProps,
  expectProp,
} from "./assertions.js";
// Code analysis
export {
  ALWAYS_SKIP,
  createExtractor,
  extractFunctions,
  getFiles,
  memoizedFileGetter,
} from "./code-analysis.js";

// Mocking
export {
  captureConsole,
  captureConsoleLogAsync,
  createConsoleCapture,
  mockFetch,
  withMockFetch,
} from "./mocking.js";
// Resource management
export {
  bracket,
  bracketAsync,
  cleanupTempDir,
  createTempDir,
  createTempFile,
  withMockedCwd,
  withMockedCwdAsync,
  withMockedProcessExit,
  withSubDir,
  withSubDirAsync,
  withTempDir,
  withTempDirAsync,
  withTempFile,
} from "./resource.js";
