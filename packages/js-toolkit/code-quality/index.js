/**
 * Code quality utilities
 *
 * @example
 * import { createCodeChecker, runSteps } from "@chobble/js-toolkit/code-quality";
 */

// Runner utilities
export {
  COMMON_STEPS,
  createTestsWithCoverageStep,
  extractErrorsFromOutput,
  printSummary,
  printTruncatedList,
  runStep,
  runSteps,
} from "./runner.js";
// Scanner utilities
export {
  // File analysis
  analyzeFiles,
  // Allowlist analysis
  analyzeWithAllowlist,
  assertNoViolations,
  // Common patterns
  COMMENT_LINE_PATTERNS,
  combineFileLists,
  // Code checker factory
  createCodeChecker,
  createPatternMatcher,
  // Violation factory
  createViolation,
  // File list utilities
  excludeFiles,
  expectNoStaleExceptions,
  expectNoStaleFunctionAllowlist,
  // Export detection
  extractExports,
  findPatterns,
  // Violation reporting
  formatViolationReport,
  isCommentLine,
  // Function allowlist validation
  isFunctionDefined,
  // Pattern matching
  matchesAny,
  // File reading
  readSource,
  scanFilesForViolations,
  scanLines,
  toLines,
  // Exception validation
  validateExceptions,
  validateFunctionAllowlist,
  withAllowlist,
} from "./scanner.js";
