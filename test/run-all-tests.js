#!/usr/bin/env node

import { spawnSync } from "child_process";
import { readdir } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

// Check for --verbose flag or TEST_VERBOSE env var
const verbose =
  process.argv.includes("--verbose") || process.env.TEST_VERBOSE === "1";

async function runAllTests() {
  if (verbose) {
    console.log("=== Running All Tests ===\n");
  }

  const files = await readdir(__dirname);
  const testFiles = files.filter((f) => f.endsWith(".test.js"));

  if (verbose) {
    console.log(`Found ${testFiles.length} test files\n`);
  }

  const failedTests = [];
  let totalTestsPassed = 0;
  let totalTestsFailed = 0;

  // Parse test results from output
  const parseTestResults = (output) => {
    const match = output?.match(/__TEST_RESULTS__:(\d+):(\d+)/);
    if (match) {
      return { passed: parseInt(match[1], 10), failed: parseInt(match[2], 10) };
    }
    return null;
  };

  for (const testFile of testFiles) {
    const testPath = join(__dirname, testFile);

    if (verbose) {
      console.log(`\n📝 Running ${testFile}...`);
      console.log("─".repeat(50));
    }

    // Pass verbose flag to child processes via env
    const env = { ...process.env, TEST_VERBOSE: verbose ? "1" : "" };

    const result = spawnSync("node", [testPath], {
      cwd: rootDir,
      env,
      encoding: "utf-8",
    });

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";

    // Parse test counts from output
    const results = parseTestResults(stdout);
    if (results) {
      totalTestsPassed += results.passed;
      totalTestsFailed += results.failed;
    }

    if (result.status === 0) {
      if (verbose) {
        // Print output without the __TEST_RESULTS__ line
        const cleanOutput = stdout.replace(/__TEST_RESULTS__:\d+:\d+\n?/, "");
        if (cleanOutput.trim()) {
          console.log(cleanOutput.trimEnd());
        }
        console.log(`✅ ${testFile} passed`);
      }
    } else {
      failedTests.push({ file: testFile, stdout, stderr });
      if (verbose) {
        const cleanOutput = stdout.replace(/__TEST_RESULTS__:\d+:\d+\n?/, "");
        if (cleanOutput.trim()) {
          console.log(cleanOutput.trimEnd());
        }
        if (stderr.trim()) {
          console.error(stderr.trimEnd());
        }
        console.log(`❌ ${testFile} failed`);
      }
    }
  }

  // Summary
  const filesPassed = testFiles.length - failedTests.length;

  if (!verbose) {
    // Quiet mode summary
    console.log(
      `\n${testFiles.length} files, ${totalTestsPassed} tests passed`,
    );

    if (failedTests.length > 0) {
      console.log("\n" + "=".repeat(50));
      console.log("FAILURES");
      console.log("=".repeat(50));
      for (const { file, stdout, stderr } of failedTests) {
        console.log(`\n❌ ${file}`);
        const output = (stdout + "\n" + stderr)
          .replace(/__TEST_RESULTS__:\d+:\d+\n?/, "")
          .trim();
        if (output) {
          console.log(output);
        }
      }
    }
  } else {
    console.log("\n" + "=".repeat(50));
    console.log("TEST SUMMARY");
    console.log("=".repeat(50));
    console.log(`✅ Files: ${filesPassed}/${testFiles.length}`);
    console.log(`✅ Tests: ${totalTestsPassed} passed`);
    if (totalTestsFailed > 0) {
      console.log(`❌ Tests: ${totalTestsFailed} failed`);
    }

    if (failedTests.length > 0) {
      console.log("\nFailed files:");
      failedTests.forEach(({ file }) => console.log(`  - ${file}`));
    }
  }

  if (failedTests.length > 0) {
    process.exit(1);
  } else if (!verbose) {
    console.log("✅ All tests passed!");
  } else {
    console.log("\n🎉 All tests passed!");
  }
}

runAllTests();
