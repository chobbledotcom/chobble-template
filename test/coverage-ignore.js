/**
 * Files excluded from coverage thresholds.
 *
 * Empty on purpose: every file the unit suite loads is held to the 100%
 * line/function thresholds in vitest.config.js. Before adding an entry
 * here, try to test the file instead - the browser-automation and CLI
 * modules are all covered through module-boundary mocks, so "hard to
 * test" usually means "needs a seam", not an exclusion.
 *
 * Shared by vitest.config.js (coverage.exclude) and the per-file lcov gap
 * report in test-runner-utils.js, so the two never drift.
 */
export const COVERAGE_IGNORE = [];
