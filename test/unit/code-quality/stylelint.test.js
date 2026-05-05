import { describe, expect, test } from "bun:test";
import { runScriptCheck } from "#test/unit/code-quality/code-quality-utils.js";

describe("stylelint", () => {
  test(
    "SCSS files are sorted and pass stylelint",
    () => {
      const status = runScriptCheck(
        "lint:scss",
        "stylelint reported issues",
        25000,
      );
      expect(status).toBe(0);
    },
    { timeout: 30000 },
  );
});
