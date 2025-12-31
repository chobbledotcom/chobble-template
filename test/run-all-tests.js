#!/usr/bin/env node

import { spawnSync } from "child_process";
import { readdir, stat } from "fs/promises";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

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

async function runAllTests() {
  console.log("=== Running All Tests ===\n");

  const testFiles = await findTestFiles(__dirname);
  testFiles.sort();

  console.log(`Found ${testFiles.length} test files\n`);

  const failedTests = [];

  for (const testPath of testFiles) {
    const displayName = relative(__dirname, testPath);
    console.log(`\n📝 Running ${displayName}...`);
    console.log("─".repeat(50));

    const result = spawnSync("node", [testPath], {
      stdio: "inherit",
      cwd: rootDir,
    });

    if (result.status === 0) {
      console.log(`✅ ${displayName} passed`);
    } else {
      failedTests.push(displayName);
      console.log(`❌ ${displayName} failed`);
    }
  }

  // Summary
  const passed = testFiles.length - failedTests.length;
  console.log("\n" + "=".repeat(50));
  console.log("TEST SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failedTests.length}`);

  if (failedTests.length > 0) {
    console.log("\nFailed tests:");
    failedTests.forEach((test) => console.log(`  - ${test}`));
    process.exit(1);
  } else {
    console.log("\n🎉 All tests passed!");
  }
}

runAllTests();
