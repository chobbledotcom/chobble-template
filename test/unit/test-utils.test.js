import { describe, expect, test } from "bun:test";
import { expectValidScriptTag } from "#test/test-utils.js";

describe("test-utils", () => {
  // ============================================
  // expectValidScriptTag Tests
  // ============================================
  describe("expectValidScriptTag", () => {
    test("Validates a correct script tag", () => {
      const validTag =
        '<script id="site-config" type="application/json">{"key": "value"}</script>';

      // Should not throw
      expect(() => expectValidScriptTag(validTag)).not.toThrow();
    });

    test("Validates script tag starts with correct id", () => {
      const validTag =
        '<script id="site-config" type="application/json"></script>';

      expect(() => expectValidScriptTag(validTag)).not.toThrow();
    });

    test("Validates script tag includes correct type", () => {
      const validTag =
        '<script id="site-config" type="application/json"></script>';

      expect(() => expectValidScriptTag(validTag)).not.toThrow();
    });

    test("Validates script tag ends correctly", () => {
      const validTag =
        '<script id="site-config" type="application/json"></script>';

      expect(() => expectValidScriptTag(validTag)).not.toThrow();
    });

    test("Throws when script tag has wrong id", () => {
      const invalidTag =
        '<script id="wrong-id" type="application/json"></script>';

      expect(() => expectValidScriptTag(invalidTag)).toThrow();
    });

    test("Throws when script tag has wrong type", () => {
      const invalidTag =
        '<script id="site-config" type="text/javascript"></script>';

      expect(() => expectValidScriptTag(invalidTag)).toThrow();
    });

    test("Throws when script tag does not end correctly", () => {
      const invalidTag =
        '<script id="site-config" type="application/json">content';

      expect(() => expectValidScriptTag(invalidTag)).toThrow();
    });

    test("Validates script tag with JSON content", () => {
      const validTag =
        '<script id="site-config" type="application/json">{"foo":"bar","items":[1,2,3]}</script>';

      expect(() => expectValidScriptTag(validTag)).not.toThrow();
    });

    test("Validates script tag with empty content", () => {
      const validTag =
        '<script id="site-config" type="application/json"></script>';

      expect(() => expectValidScriptTag(validTag)).not.toThrow();
    });

    test("Validates script tag with whitespace", () => {
      const validTag =
        '<script id="site-config"  type="application/json"  ></script>';

      expect(() => expectValidScriptTag(validTag)).not.toThrow();
    });
  });
});
