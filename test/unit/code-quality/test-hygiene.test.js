import { describe, expect, test } from "bun:test";
import {
  SRC_HTML_FILES,
  SRC_JS_FILES,
  SRC_SCSS_FILES,
  TEST_FILES,
} from "#test/test-utils.js";

describe("test-hygiene", () => {
  test("Pre-computed file lists contain files", () => {
    expect(SRC_JS_FILES().length).toBeGreaterThan(0);
    expect(SRC_HTML_FILES().length).toBeGreaterThan(0);
    expect(SRC_SCSS_FILES().length).toBeGreaterThan(0);
    expect(TEST_FILES().length).toBeGreaterThan(0);
  });
});
