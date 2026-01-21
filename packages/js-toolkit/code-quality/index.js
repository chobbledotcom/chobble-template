/**
 * Code quality utilities
 *
 * @example
 * import { createCodeChecker, runSteps } from "@chobble/js-toolkit/code-quality";
 */

export {
  COMMON_STEPS,
  coverageStep,
  extractErrorsFromOutput,
  printSummary,
  printTruncatedList,
  runStep,
  runSteps,
} from "./runner.js";

export {
  analyzeFiles,
  analyzeWithAllowlist,
  assertNoViolations,
  COMMENT_LINE_PATTERNS,
  combineFileLists,
  createCodeChecker,
  createPatternMatcher,
  createViolation,
  excludeFiles,
  expectNoStaleExceptions,
  extractExports,
  findPatterns,
  formatViolationReport,
  isCommentLine,
  isFunctionDefined,
  matchesAny,
  noStaleAllowlist,
  readSource,
  scanFilesForViolations,
  scanLines,
  toLines,
  validateExceptions,
  validateFunctionAllowlist,
  withAllowlist,
} from "./scanner.js";
