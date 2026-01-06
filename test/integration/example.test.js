import { describe, expect, test } from "bun:test";

// Integration tests go in this folder.
// Integration tests may:
// - Test multiple modules working together
// - Perform file I/O, build steps, or network operations
// - Take longer to run than unit tests
//
// To run only integration tests: bun run test:integration
// To run all tests: bun run test

describe("example integration test", () => {
	test("demonstrates integration test structure", () => {
		// Integration tests often involve multiple components
		const data = { items: [1, 2, 3] };
		const transform = (d) => d.items.map((x) => x * 2);
		const format = (arr) => arr.join(", ");

		const result = format(transform(data));
		expect(result).toBe("2, 4, 6");
	});
});
