#!/usr/bin/env node

import { execSync } from "child_process";
import { readdir } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

async function runAllTests() {
	console.log("=== Running All Tests ===\n");

	try {
		// Get all test files
		const files = await readdir(__dirname);
		const testFiles = files.filter((f) => f.endsWith(".test.js"));

		console.log(`Found ${testFiles.length} test files\n`);

		let passed = 0;
		let failed = 0;
		const failedTests = [];

		for (const testFile of testFiles) {
			const testPath = join(__dirname, testFile);
			console.log(`\n📝 Running ${testFile}...`);
			console.log("─".repeat(50));

			try {
				execSync(`node ${testPath}`, {
					stdio: "inherit",
					cwd: rootDir,
				});
				passed++;
				console.log(`✅ ${testFile} passed`);
			} catch (error) {
				failed++;
				failedTests.push(testFile);
				console.log(`❌ ${testFile} failed`);
			}
		}

		// Summary
		console.log("\n" + "=".repeat(50));
		console.log("TEST SUMMARY");
		console.log("=".repeat(50));
		console.log(`✅ Passed: ${passed}`);
		console.log(`❌ Failed: ${failed}`);

		if (failedTests.length > 0) {
			console.log("\nFailed tests:");
			failedTests.forEach((test) => console.log(`  - ${test}`));
			process.exit(1);
		} else {
			console.log("\n🎉 All tests passed!");
		}
	} catch (error) {
		console.error("Error running tests:", error);
		process.exit(1);
	}
}

runAllTests();
