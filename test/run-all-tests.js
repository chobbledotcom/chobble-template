#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import os from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

// Number of parallel workers (default to CPU count, max 8)
const maxWorkers = Math.min(os.cpus().length, 8);

// Check for --verbose flag or TEST_VERBOSE env var
const verbose =
  process.argv.includes("--verbose") || process.env.TEST_VERBOSE === "1";

/**
 * Recursively find all .test.js files in a directory
 */
const findTestFiles = async (dir) => {
  const entries = await readdir(dir);
  const results = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      results.push(...(await findTestFiles(fullPath)));
    } else if (entry.endsWith(".test.js")) {
      results.push(fullPath);
    }
  }

  return results;
};

/**
 * Run a single test file and return the result
 */
const runTestFile = (testPath, env) => {
  return new Promise((resolve) => {
    const child = spawn("node", [testPath], {
      cwd: rootDir,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ status: code, stdout, stderr });
    });

    child.on("error", (err) => {
      resolve({ status: 1, stdout, stderr: stderr + err.message });
    });
  });
};

/**
 * Run tests in parallel with a worker pool
 */
const runTestsParallel = async (testFiles, env, onResult) => {
  const queue = [...testFiles];
  const running = new Map();

  const startNext = () => {
    if (queue.length === 0) return null;
    const testPath = queue.shift();
    const promise = runTestFile(testPath, env).then((result) => {
      running.delete(testPath);
      onResult(testPath, result);
      return startNext();
    });
    running.set(testPath, promise);
    return promise;
  };

  // Start initial batch of workers
  const initialPromises = [];
  for (let i = 0; i < maxWorkers && queue.length > 0; i++) {
    initialPromises.push(startNext());
  }

  // Wait for all tests to complete
  await Promise.all(initialPromises);
  while (running.size > 0) {
    await Promise.race(running.values());
  }
};

async function runAllTests() {
  if (verbose) {
    console.log("=== Running All Tests ===\n");
    console.log(`Using ${maxWorkers} parallel workers\n`);
  }

  const testFiles = await findTestFiles(__dirname);
  testFiles.sort();

  if (verbose) {
    console.log(`Found ${testFiles.length} test files\n`);
  }

  const failedTests = [];
  let totalTestsPassed = 0;
  let totalTestsFailed = 0;
  let completedCount = 0;

  // Parse test results from output
  const parseTestResults = (output) => {
    const match = output?.match(/__TEST_RESULTS__:(\d+):(\d+)/);
    if (match) {
      return { passed: parseInt(match[1], 10), failed: parseInt(match[2], 10) };
    }
    return null;
  };

  // Pass verbose flag to child processes via env
  const env = { ...process.env, TEST_VERBOSE: verbose ? "1" : "" };

  const handleResult = (testPath, result) => {
    const displayName = relative(__dirname, testPath);
    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    completedCount++;

    // Parse test counts from output
    const results = parseTestResults(stdout);
    if (results) {
      totalTestsPassed += results.passed;
      totalTestsFailed += results.failed;
    }

    if (result.status === 0) {
      if (verbose) {
        const cleanOutput = stdout.replace(/__TEST_RESULTS__:\d+:\d+\n?/, "");
        if (cleanOutput.trim()) {
          console.log(cleanOutput.trimEnd());
        }
        console.log(`✅ ${displayName} passed`);
      } else {
        // Show progress in quiet mode
        process.stdout.write(
          `\r${completedCount}/${testFiles.length} tests completed`,
        );
      }
    } else {
      failedTests.push({ file: displayName, stdout, stderr });
      if (verbose) {
        const cleanOutput = stdout.replace(/__TEST_RESULTS__:\d+:\d+\n?/, "");
        if (cleanOutput.trim()) {
          console.log(cleanOutput.trimEnd());
        }
        if (stderr.trim()) {
          console.error(stderr.trimEnd());
        }
        console.log(`❌ ${displayName} failed`);
      }
    }
  };

  await runTestsParallel(testFiles, env, handleResult);

  // Summary
  const filesPassed = testFiles.length - failedTests.length;

  if (!verbose) {
    // Clear progress line and show summary
    process.stdout.write(`\r${" ".repeat(50)}\r`);
    console.log(
      `\n${testFiles.length} files, ${totalTestsPassed} tests passed`,
    );

    if (failedTests.length > 0) {
      console.log(`\n${"=".repeat(50)}`);
      console.log("FAILURES");
      console.log("=".repeat(50));
      for (const { file, stdout, stderr } of failedTests) {
        console.log(`\n❌ ${file}`);
        const output = `${stdout}\n${stderr}`
          .replace(/__TEST_RESULTS__:\d+:\d+\n?/, "")
          .trim();
        if (output) {
          console.log(output);
        }
      }
    }
  } else {
    console.log(`\n${"=".repeat(50)}`);
    console.log("TEST SUMMARY");
    console.log("=".repeat(50));
    console.log(`✅ Files: ${filesPassed}/${testFiles.length}`);
    console.log(`✅ Tests: ${totalTestsPassed} passed`);
    if (totalTestsFailed > 0) {
      console.log(`❌ Tests: ${totalTestsFailed} failed`);
    }

    if (failedTests.length > 0) {
      console.log("\nFailed files:");
      for (const { file } of failedTests) {
        console.log(`  - ${file}`);
      }
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
