#!/usr/bin/env node

import { spawnSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const configPath = resolve(rootDir, ".test_coverage.json");

function readLimits() {
	const content = readFileSync(configPath, "utf-8");
	return JSON.parse(content);
}

function writeLimits(limits) {
	const content = JSON.stringify(limits, null, "\t") + "\n";
	writeFileSync(configPath, content, "utf-8");
}

function runCoverage() {
	const limits = readLimits();

	// Run c8 with current limits and JSON reporter
	const c8Args = [
		"--lines",
		String(limits.lines),
		"--functions",
		String(limits.functions),
		"--branches",
		String(limits.branches),
		"--reporter=text",
		"--reporter=json",
		"--report-dir=coverage",
		"node",
		"test/run-all-tests.js",
	];

	// Pass through any additional args (like --verbose via TEST_VERBOSE env)
	const result = spawnSync("npx", ["c8", ...c8Args], {
		cwd: rootDir,
		stdio: "inherit",
		env: process.env,
	});

	if (result.status !== 0) {
		process.exit(result.status || 1);
	}

	// Tests passed, now check if we should ratchet up the limits
	ratchetLimits(limits);
}

function ratchetLimits(currentLimits) {
	// Read the JSON coverage report
	const reportPath = resolve(rootDir, "coverage", "coverage-summary.json");
	let report;
	try {
		const content = readFileSync(reportPath, "utf-8");
		report = JSON.parse(content);
	} catch {
		// No JSON report available, skip ratcheting
		return;
	}

	const total = report.total;
	if (!total) {
		return;
	}

	// Get actual coverage percentages (rounded down to match c8 behavior)
	const actualLines = Math.floor(total.lines.pct);
	const actualFunctions = Math.floor(total.functions.pct);
	const actualBranches = Math.floor(total.branches.pct);

	let updated = false;
	const newLimits = { ...currentLimits };

	if (actualLines > currentLimits.lines) {
		newLimits.lines = actualLines;
		updated = true;
	}

	if (actualFunctions > currentLimits.functions) {
		newLimits.functions = actualFunctions;
		updated = true;
	}

	if (actualBranches > currentLimits.branches) {
		newLimits.branches = actualBranches;
		updated = true;
	}

	if (updated) {
		writeLimits(newLimits);
		console.log("\n📈 Coverage limits updated in .test_coverage.json:");
		if (newLimits.lines !== currentLimits.lines) {
			console.log(`   lines: ${currentLimits.lines}% → ${newLimits.lines}%`);
		}
		if (newLimits.functions !== currentLimits.functions) {
			console.log(
				`   functions: ${currentLimits.functions}% → ${newLimits.functions}%`,
			);
		}
		if (newLimits.branches !== currentLimits.branches) {
			console.log(
				`   branches: ${currentLimits.branches}% → ${newLimits.branches}%`,
			);
		}
	}
}

runCoverage();
