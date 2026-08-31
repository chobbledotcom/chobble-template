import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  buildHermeticEnv,
  isPristineTemplateCheckout,
  parseArgs,
  REQUIRED_FIXTURE_ENTRIES,
} from "#scripts/stage-hermetic-tests.js";
import { FIXTURES_ROOT_ENV } from "#test/test-site-factory.js";
import { withTempDir } from "#test/test-utils.js";

describe("parseArgs", () => {
  test("reads --template and forwards args after --", () => {
    const args = parseArgs([
      "--template",
      "/tmp/pristine-template",
      "--",
      "test/integration",
      "-t",
      "should render",
    ]);

    expect(args.template).toBe("/tmp/pristine-template");
    expect(args.forward).toEqual(["test/integration", "-t", "should render"]);
  });

  test("defaults template to null and forward to empty when unset", () => {
    const args = parseArgs([]);

    expect(args.template).toBeNull();
    expect(args.forward).toEqual([]);
  });

  test("forward is empty when no -- separator is given", () => {
    const args = parseArgs(["--template", "/tmp/pristine-template"]);

    expect(args.forward).toEqual([]);
  });
});

describe("isPristineTemplateCheckout", () => {
  test("rejects a directory missing required fixture entries", () =>
    withTempDir("stage-hermetic-tests-missing", (dir) => {
      expect(isPristineTemplateCheckout(dir)).toBe(false);
    }));

  test("rejects a directory with only some required fixture entries", () =>
    withTempDir("stage-hermetic-tests-partial", (dir) => {
      fs.mkdirSync(path.join(dir, "test"));
      fs.mkdirSync(path.join(dir, "src"));

      expect(isPristineTemplateCheckout(dir)).toBe(false);
    }));

  test("accepts a directory containing every required fixture entry", () =>
    withTempDir("stage-hermetic-tests-complete", (dir) => {
      for (const entry of REQUIRED_FIXTURE_ENTRIES) {
        fs.mkdirSync(path.join(dir, entry), { recursive: true });
      }

      expect(isPristineTemplateCheckout(dir)).toBe(true);
    }));
});

describe("buildHermeticEnv", () => {
  test("sets the fixtures root env var without mutating the base env", () => {
    const baseEnv = Object.freeze({ PATH: "/usr/bin" });

    const env = buildHermeticEnv(baseEnv, "/tmp/pristine-template");

    expect(env[FIXTURES_ROOT_ENV]).toBe("/tmp/pristine-template");
    expect(env.PATH).toBe("/usr/bin");
    expect(baseEnv[FIXTURES_ROOT_ENV]).toBeUndefined();
  });

  test("overrides an existing fixtures root env var", () => {
    const baseEnv = { [FIXTURES_ROOT_ENV]: "/old/path" };

    const env = buildHermeticEnv(baseEnv, "/new/path");

    expect(env[FIXTURES_ROOT_ENV]).toBe("/new/path");
  });
});
