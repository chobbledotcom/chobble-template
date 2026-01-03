import { resolve } from "node:path";
import { createTestRunner, expectTrue, fs, rootDir } from "#test/test-utils.js";

const configPath = resolve(rootDir, ".test_coverage.json");
const runCoveragePath = resolve(rootDir, "test/run-coverage.js");

const testCases = [
  {
    name: "coverage-config-exists",
    description: ".test_coverage.json should exist",
    test: () => {
      expectTrue(
        fs.existsSync(configPath),
        ".test_coverage.json file is missing - coverage thresholds cannot be enforced",
      );
    },
  },
  {
    name: "coverage-config-valid-json",
    description: ".test_coverage.json should contain valid JSON object",
    test: () => {
      const content = fs.readFileSync(configPath, "utf-8");
      // JSON.parse will throw if invalid - that's a valid test failure
      const parsed = JSON.parse(content);
      expectTrue(
        typeof parsed === "object" && parsed !== null,
        ".test_coverage.json should parse to an object",
      );
    },
  },
  {
    name: "coverage-config-has-required-fields",
    description:
      ".test_coverage.json should have lines, functions, and branches thresholds",
    test: () => {
      const content = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);

      expectTrue(
        typeof config.lines === "number",
        ".test_coverage.json must have a numeric 'lines' threshold",
      );
      expectTrue(
        typeof config.functions === "number",
        ".test_coverage.json must have a numeric 'functions' threshold",
      );
      expectTrue(
        typeof config.branches === "number",
        ".test_coverage.json must have a numeric 'branches' threshold",
      );
    },
  },
  {
    name: "coverage-config-thresholds-valid-range",
    description: "Coverage thresholds should be between 0 and 100",
    test: () => {
      const content = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);

      for (const field of ["lines", "functions", "branches"]) {
        const value = config[field];
        expectTrue(
          value >= 0 && value <= 100,
          `${field} threshold (${value}) must be between 0 and 100`,
        );
      }
    },
  },
  {
    name: "run-coverage-script-exists",
    description: "test/run-coverage.js should exist",
    test: () => {
      expectTrue(
        fs.existsSync(runCoveragePath),
        "test/run-coverage.js is missing - coverage enforcement script not found",
      );
    },
  },
  {
    name: "run-coverage-uses-check-coverage-flag",
    description:
      "run-coverage.js should use --check-coverage flag to enforce thresholds",
    test: () => {
      const content = fs.readFileSync(runCoveragePath, "utf-8");
      expectTrue(
        content.includes("--check-coverage"),
        "run-coverage.js must use --check-coverage flag to enforce coverage thresholds. Without this flag, coverage failures won't cause test failures.",
      );
    },
  },
  {
    name: "run-coverage-reads-config-file",
    description:
      "run-coverage.js should read thresholds from .test_coverage.json",
    test: () => {
      const content = fs.readFileSync(runCoveragePath, "utf-8");
      expectTrue(
        content.includes(".test_coverage.json"),
        "run-coverage.js must read coverage thresholds from .test_coverage.json",
      );
    },
  },
  {
    name: "run-coverage-exits-on-failure",
    description: "run-coverage.js should call process.exit on coverage failure",
    test: () => {
      const content = fs.readFileSync(runCoveragePath, "utf-8");
      expectTrue(
        content.includes("process.exit"),
        "run-coverage.js must call process.exit when coverage check fails",
      );
      // Verify the exit happens when status is non-zero
      expectTrue(
        content.includes("result.status !== 0") ||
          content.includes("result.status != 0"),
        "run-coverage.js must check for non-zero exit status from c8",
      );
    },
  },
  {
    name: "run-coverage-passes-thresholds-to-c8",
    description: "run-coverage.js should pass all threshold types to c8",
    test: () => {
      const content = fs.readFileSync(runCoveragePath, "utf-8");
      expectTrue(
        content.includes("--lines") &&
          content.includes("--functions") &&
          content.includes("--branches"),
        "run-coverage.js must pass --lines, --functions, and --branches flags to c8",
      );
    },
  },
];

createTestRunner("coverage-check", testCases);
