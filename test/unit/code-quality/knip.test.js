import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { rootDir } from "#test/test-utils.js";

// Functional pipe utility
const pipe =
	(...fns) =>
	(initialValue) =>
		fns.reduce((value, fn) => fn(value), initialValue);

// Functional composition helpers
const getCacheKey = () => {
	const gitHash = spawnSync("git", ["rev-parse", "HEAD"], {
		cwd: rootDir,
		encoding: "utf-8",
	});

	const knipConfig = existsSync(join(rootDir, "knip.json"))
		? readFileSync(join(rootDir, "knip.json"), "utf-8")
		: "";

	return createHash("sha256")
		.update(gitHash.stdout.trim() + knipConfig)
		.digest("hex");
};

const getCachedResult = (cacheKey) => {
	const cachePath = join(rootDir, "node_modules", ".cache", "knip-test.json");

	if (!existsSync(cachePath)) return null;

	try {
		const cache = JSON.parse(readFileSync(cachePath, "utf-8"));
		return cache.key === cacheKey ? cache.result : null;
	} catch {
		return null;
	}
};

const cacheResult = (cacheKey, result) => {
	const cacheDir = join(rootDir, "node_modules", ".cache");
	const cachePath = join(cacheDir, "knip-test.json");

	try {
		if (!existsSync(cacheDir)) {
			require("node:fs").mkdirSync(cacheDir, { recursive: true });
		}
		writeFileSync(
			cachePath,
			JSON.stringify({ key: cacheKey, result }, null, 2),
		);
	} catch (error) {
		// Cache write failure shouldn't fail the test
		console.warn("Failed to cache knip result:", error.message);
	}

	return result;
};

const runKnip = () =>
	spawnSync("bun", ["run", "knip"], {
		cwd: rootDir,
		encoding: "utf-8",
		stdio: ["pipe", "pipe", "pipe"],
	});

const logFailureDetails = (result) => {
	if (result.status !== 0) {
		console.log("\n  Knip found issues:\n");
		console.log(result.stdout || result.stderr);
	}
	return result;
};

const extractStatus = (result) => result.status;

// Main test logic using pipe
const getKnipStatus = pipe(
	getCacheKey,
	(cacheKey) => ({
		cacheKey,
		cached: getCachedResult(cacheKey),
	}),
	({ cacheKey, cached }) =>
		cached || cacheResult(cacheKey, runKnip()),
	logFailureDetails,
	extractStatus,
);

describe("knip", () => {
	test("Knip finds no unused exports or dependencies", () => {
		const status = getKnipStatus();
		expect(status).toBe(0);
	});
});
