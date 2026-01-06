import { describe, expect, test } from "bun:test";

// Unit tests go in this folder.
// Unit tests should:
// - Test individual functions in isolation
// - Run fast (no file I/O, no network, no build steps)
// - Not depend on external state or services
//
// To run only unit tests: bun run test:unit
// To run all tests: bun run test

describe("example unit test", () => {
	test("demonstrates unit test structure", () => {
		const add = (a, b) => a + b;
		expect(add(2, 3)).toBe(5);
	});
});
