#!/usr/bin/env bun

/**
 * Opt-in hermetic test staging for downstream clients.
 *
 * Clients copy this template excluding test/, test-*, images/, and markdown
 * content, then overlay their own site content under src/. Manually adding
 * back test/, src image fixtures, and packages/js-toolkit/test-utils lets
 * the full suite run, but fixture-driven tests that assert on template
 * defaults (site.json/config.json values, sample markdown content, sample
 * images) end up reading the client's own overridden content instead,
 * because the test fixture factory sources "template defaults" from the
 * live checkout root.
 *
 * This entry point points the fixture factory (see test/test-site-factory.js)
 * at a separate, pristine chobble-template checkout via an env var, then
 * runs the test command in the current (downstream) checkout so fixture
 * tests build isolated sites from template-owned defaults rather than
 * client overrides.
 *
 * Usage:
 *   bun scripts/stage-hermetic-tests.js --template <path-to-pristine-checkout> [-- <bun test args>]
 *
 * Example:
 *   git clone --depth 1 https://github.com/chobbledotcom/chobble-template.git /tmp/chobble-template-upstream
 *   bun scripts/stage-hermetic-tests.js --template /tmp/chobble-template-upstream -- test/integration
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { FIXTURES_ROOT_ENV } from "#test/test-site-factory.js";

const USAGE =
  "Usage: bun scripts/stage-hermetic-tests.js --template <path-to-pristine-chobble-template-checkout> [-- <bun test args>]";

/** Parse CLI args into { template, forward }. Pure. */
const parseArgs = (argv) => {
  const args = { template: null, forward: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--template") {
      args.template = argv[++i];
    } else if (arg === "--") {
      args.forward = argv.slice(i + 1);
      break;
    }
  }
  return args;
};

/** A directory only looks like a pristine template checkout if it ships the fixtures we need. */
const REQUIRED_FIXTURE_ENTRIES = [
  "test",
  "src",
  "packages/js-toolkit/test-utils",
];

const isPristineTemplateCheckout = (dir) =>
  REQUIRED_FIXTURE_ENTRIES.every((entry) =>
    fs.existsSync(path.join(dir, entry)),
  );

/** Build the env used to run the downstream test command against pristine fixtures. Pure. */
const buildHermeticEnv = (baseEnv, templateDir) => ({
  ...baseEnv,
  [FIXTURES_ROOT_ENV]: templateDir,
});

const run = () => {
  const { template, forward } = parseArgs(process.argv.slice(2));

  if (!template) {
    console.error(USAGE);
    process.exit(1);
  }

  const templateDir = path.resolve(template);
  if (!isPristineTemplateCheckout(templateDir)) {
    console.error(
      `--template ${templateDir} does not look like a chobble-template checkout ` +
        `(expected ${REQUIRED_FIXTURE_ENTRIES.join(", ")})`,
    );
    process.exit(1);
  }

  const testArgs = ["test", ...forward];
  const result = spawnSync("bun", testArgs, {
    stdio: "inherit",
    env: buildHermeticEnv(process.env, templateDir),
  });

  process.exit(result.status ?? 1);
};

export {
  buildHermeticEnv,
  isPristineTemplateCheckout,
  parseArgs,
  REQUIRED_FIXTURE_ENTRIES,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
