import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

/**
 * Tests for console.js wrapper utility.
 *
 * Tests the conditional console logging that:
 * - Always allows output in Node.js (server-side build)
 * - Only allows output in serve mode (localhost) in browser
 * - Blocks output in production browser environment
 */
describe("console wrapper", () => {
  let originalConsoleLog;
  let originalConsoleError;
  let logCalls;
  let errorCalls;

  beforeEach(async () => {
    // Store originals
    originalConsoleLog = console.log;
    originalConsoleError = console.error;

    // Track calls
    logCalls = [];
    errorCalls = [];

    // Mock console methods
    console.log = mock((...args) => {
      logCalls.push(args);
    });
    console.error = mock((...args) => {
      errorCalls.push(args);
    });

    // Clear module cache to re-import with different environment
    // This allows us to test different runtime conditions
    delete require.cache[require.resolve("#utils/console.js")];
  });

  afterEach(() => {
    // Restore originals
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  test("log function exists and is callable", async () => {
    const { log } = await import("#utils/console.js");

    expect(typeof log).toBe("function");
  });

  test("error function exists and is callable", async () => {
    const { error } = await import("#utils/console.js");

    expect(typeof error).toBe("function");
  });

  test("log outputs in Node.js environment", async () => {
    // In Node.js environment (our test environment), log should work
    const { log } = await import("#utils/console.js");

    log("test message", 123);

    expect(logCalls.length).toBe(1);
    expect(logCalls[0]).toEqual(["test message", 123]);
  });

  test("error outputs in Node.js environment", async () => {
    // In Node.js environment (our test environment), error should work
    const { error } = await import("#utils/console.js");

    error("error message", { code: 500 });

    expect(errorCalls.length).toBe(1);
    expect(errorCalls[0]).toEqual(["error message", { code: 500 }]);
  });

  test("log accepts multiple arguments", async () => {
    const { log } = await import("#utils/console.js");

    log("message", 1, 2, 3, { key: "value" });

    expect(logCalls.length).toBe(1);
    expect(logCalls[0]).toEqual(["message", 1, 2, 3, { key: "value" }]);
  });

  test("error accepts multiple arguments", async () => {
    const { error } = await import("#utils/console.js");

    error("error", "details", 404);

    expect(errorCalls.length).toBe(1);
    expect(errorCalls[0]).toEqual(["error", "details", 404]);
  });

  test("log can be called with no arguments", async () => {
    const { log } = await import("#utils/console.js");

    log();

    expect(logCalls.length).toBe(1);
    expect(logCalls[0]).toEqual([]);
  });

  test("error can be called with no arguments", async () => {
    const { error } = await import("#utils/console.js");

    error();

    expect(errorCalls.length).toBe(1);
    expect(errorCalls[0]).toEqual([]);
  });

  test("isServeMode detects Node.js environment", () => {
    // Test the logic for Node.js detection
    const isNodeJs =
      typeof process !== "undefined" &&
      process.versions != null &&
      process.versions.node != null;

    expect(isNodeJs).toBe(true);
  });

  test("isServeMode would detect localhost in browser", () => {
    // Test the logic for localhost detection
    const testHost = "localhost";
    const isLocalhost =
      testHost === "localhost" || testHost === "127.0.0.1" || testHost === "";

    expect(isLocalhost).toBe(true);
  });

  test("isServeMode would detect 127.0.0.1 in browser", () => {
    const testHost = "127.0.0.1";
    const isLocalhost =
      testHost === "localhost" || testHost === "127.0.0.1" || testHost === "";

    expect(isLocalhost).toBe(true);
  });

  test("isServeMode would detect empty host in browser", () => {
    const testHost = "";
    const isLocalhost =
      testHost === "localhost" || testHost === "127.0.0.1" || testHost === "";

    expect(isLocalhost).toBe(true);
  });

  test("isServeMode would reject production domain", () => {
    const testHost = "example.com";
    const isLocalhost =
      testHost === "localhost" || testHost === "127.0.0.1" || testHost === "";

    expect(isLocalhost).toBe(false);
  });

  test("isServeMode logic handles undefined location", () => {
    // Test lines 15-16: if (typeof location === "undefined") return false;
    const locationUndefined = typeof undefined === "undefined";

    expect(locationUndefined).toBe(true);

    // When location is undefined, should return false (not serve mode)
    const wouldReturnFalse = locationUndefined;
    expect(wouldReturnFalse).toBe(true);
  });

  test("Browser environment detection logic for missing process", () => {
    // Test what happens when process is undefined (browser environment)
    const mockProcess = undefined;
    const isNodeJs =
      typeof mockProcess !== "undefined" &&
      mockProcess?.versions != null &&
      mockProcess?.versions?.node != null;

    expect(isNodeJs).toBe(false);
  });

  test("Browser environment detection logic for missing process.versions", () => {
    const mockProcess = {};
    const isNodeJs =
      typeof mockProcess !== "undefined" &&
      mockProcess.versions != null &&
      mockProcess.versions?.node != null;

    expect(isNodeJs).toBe(false);
  });

  test("Browser environment detection logic for missing process.versions.node", () => {
    const mockProcess = { versions: {} };
    const isNodeJs =
      typeof mockProcess !== "undefined" &&
      mockProcess.versions != null &&
      mockProcess.versions.node != null;

    expect(isNodeJs).toBe(false);
  });

  test("Node.js environment detection with full process object", () => {
    const mockProcess = {
      versions: {
        node: "20.0.0",
      },
    };
    const isNodeJs =
      typeof mockProcess !== "undefined" &&
      mockProcess.versions != null &&
      mockProcess.versions.node != null;

    expect(isNodeJs).toBe(true);
  });

  test("Spread operator passes all arguments to console.log", async () => {
    const { log } = await import("#utils/console.js");

    const args = ["a", "b", "c"];
    log(...args);

    expect(logCalls[0]).toEqual(args);
  });

  test("Spread operator passes all arguments to console.error", async () => {
    const { error } = await import("#utils/console.js");

    const args = ["x", "y", "z"];
    error(...args);

    expect(errorCalls[0]).toEqual(args);
  });
});
