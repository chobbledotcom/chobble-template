/**
 * Mocking utilities for tests
 *
 * Provides utilities for mocking fetch, console, and other globals.
 */

/**
 * Create a console capture function with a given executor.
 * Curried: (executor) => (fn) => logs
 *
 * The executor receives (fn, cleanup, logs) where:
 * - fn: the function to execute
 * - cleanup: function to restore console.log
 * - logs: array of captured log strings
 *
 * @param {Function} executor - (fn, cleanup, logs) => result
 * @returns {Function} (fn) => logs - Console capture function
 *
 * @example
 * const captureSync = createConsoleCapture((fn, cleanup, logs) => { fn(); cleanup(); return logs; });
 */
const createConsoleCapture = (executor) => (fn) => {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(" "));
  return executor(
    fn,
    () => {
      console.log = originalLog;
    },
    logs,
  );
};

/**
 * Capture console.log output during sync function execution
 * @param {Function} fn - Function to execute
 * @returns {string[]} Array of logged messages
 *
 * @example
 * const logs = captureConsole(() => {
 *   console.log("hello");
 *   console.log("world");
 * });
 * // logs === ["hello", "world"]
 */
const captureConsole = createConsoleCapture((fn, cleanup, logs) => {
  fn();
  cleanup();
  return logs;
});

/**
 * Capture console.log output during async function execution
 * @param {Function} fn - Async function to execute
 * @returns {Promise<string[]>} Array of logged messages
 *
 * @example
 * const logs = await captureConsoleLogAsync(async () => {
 *   console.log("start");
 *   await someAsyncOp();
 *   console.log("end");
 * });
 */
const captureConsoleLogAsync = createConsoleCapture(
  async (fn, cleanup, logs) => {
    await fn();
    cleanup();
    return logs;
  },
);

/**
 * Mock globalThis.fetch for testing network calls.
 * Manual version - returns restore function for explicit control.
 *
 * @param {string|Object} response - Response data
 * @param {Object} options - { ok?: boolean, status?: number }
 * @returns {() => void} Function to restore original fetch
 *
 * @example
 * const restore = mockFetch({ data: "test" });
 * // ... run tests ...
 * restore();
 */
const mockFetch = (response, options = {}) => {
  const originalFetch = globalThis.fetch;
  const responseText =
    typeof response === "string" ? response : JSON.stringify(response);

  globalThis.fetch = async () => ({
    ok: options.ok !== false,
    status: options.status || 200,
    text: async () => responseText,
    json: async () =>
      typeof response === "string" ? JSON.parse(response) : response,
  });

  return () => {
    globalThis.fetch = originalFetch;
  };
};

/**
 * Bracket-based fetch mock.
 * Automatically restores original fetch after callback completes.
 *
 * @param {string|Object} response - Response data
 * @param {Object} options - { ok?: boolean, status?: number }
 * @param {Function} callback - async () => result
 * @returns {Promise<any>} Result of callback
 *
 * @example
 * await withMockFetch('<svg>...</svg>', {}, async () => {
 *   const result = await fetchIcon("mdi:home");
 *   expect(result).toContain("<svg");
 * });
 */
const withMockFetch = async (response, options, callback) => {
  const restore = mockFetch(response, options);
  try {
    return await callback();
  } finally {
    restore();
  }
};

export {
  captureConsole,
  captureConsoleLogAsync,
  createConsoleCapture,
  mockFetch,
  withMockFetch,
};
