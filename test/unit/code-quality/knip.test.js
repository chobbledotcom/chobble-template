import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { rootDir } from "#test/test-utils.js";

// Functional pipe utility
const pipe =
	(...fns) =>
	(initialValue) =>
		fns.reduce((value, fn) => fn(value), initialValue);

// Functional composition helpers
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
const getKnipStatus = pipe(runKnip, logFailureDetails, extractStatus);

describe("knip", () => {
	test("Knip finds no unused exports or dependencies", () => {
		const status = getKnipStatus();
		expect(status).toBe(0);
	});
});
