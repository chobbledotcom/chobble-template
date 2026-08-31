#!/usr/bin/env bun

/**
 * Opt-in hermetic test staging for downstream clients.
 *
 * Clients copy this template excluding test/, test-*, images/, and markdown
 * content, then overlay their own site content under src/. That means this
 * script cannot statically import anything under test/ (it does not exist
 * yet in that checkout) - it has to stage the missing pieces itself before
 * anything tries to load them.
 *
 * Fixture-driven tests that assert on template defaults (site.json/config.json
 * values, sample markdown content, sample images) also need "template
 * defaults" to come from a pristine template checkout rather than the
 * client's own overridden content under src/, because the test fixture
 * factory (test/test-site-factory.js) otherwise sources those defaults from
 * the live checkout root.
 *
 * This entry point, run from a downstream (client) checkout:
 *   1. Creates a temporary copy of the downstream code, excluding client-owned
 *      data, markdown, images, and generated files.
 *   2. Restores pristine template tests, data, markdown, and image fixtures in
 *      that temporary workspace.
 *   3. Points the fixture factory at the pristine checkout via
 *      CHOBBLE_TEMPLATE_FIXTURES_DIR so fixture tests build isolated sites
 *      from template-owned defaults rather than client overrides.
 *   4. Runs `bun test` against the copied downstream code, then removes the
 *      entire temporary workspace and forwards the test run's exit status.
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
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { FIXTURES_ROOT_ENV } from "#scripts/hermetic-test-config.js";

const USAGE =
  "Usage: bun scripts/stage-hermetic-tests.js --template <path-to-pristine-chobble-template-checkout> [-- <bun test args>]";
const TEMPLATE_SOURCE_FIXTURE_DIRECTORIES = [
  "_data",
  "_includes",
  "_layouts",
  "assets",
  "css",
  "images",
  "utils",
];

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
const REQUIRED_FIXTURE_DIRECTORIES = [
  "test",
  ...TEMPLATE_SOURCE_FIXTURE_DIRECTORIES.map((entry) => `src/${entry}`),
  "packages/js-toolkit/test-utils",
];
const REQUIRED_FIXTURE_FILES = ["src/src.11tydata.js", "BLOCKS_LAYOUT.md"];
const REQUIRED_FIXTURE_ENTRIES = [
  ...REQUIRED_FIXTURE_DIRECTORIES,
  ...REQUIRED_FIXTURE_FILES,
];
const WORKSPACE_FIXTURE_ENTRIES = [
  "test",
  "src/_data",
  "src/images",
  "packages/js-toolkit/test-utils",
];

const hasRequiredFixtureType = (dir, entry, typeCheck) => {
  const entryPath = path.join(dir, entry);
  return fs.existsSync(entryPath) && typeCheck(fs.statSync(entryPath));
};

const hasAllFixtureEntries = (dir, entries, typeCheck) =>
  entries.every((entry) => hasRequiredFixtureType(dir, entry, typeCheck));

const isPristineTemplateCheckout = (dir) =>
  hasAllFixtureEntries(dir, REQUIRED_FIXTURE_DIRECTORIES, (stats) =>
    stats.isDirectory(),
  ) &&
  hasAllFixtureEntries(dir, REQUIRED_FIXTURE_FILES, (stats) => stats.isFile());

/** Root-level entries matching the test-* pattern downstream checkouts exclude. Pure (given a real dir). */
const findTestStarEntries = (templateDir) =>
  fs.readdirSync(templateDir).filter((name) => name.startsWith("test-"));

/** Entries a downstream checkout is missing that the template can supply. Pure (given a real dir). */
const resolveStagingEntries = (templateDir) => [
  ...WORKSPACE_FIXTURE_ENTRIES,
  ...findTestStarEntries(templateDir),
];

const GENERATED_ROOT_ENTRIES = [
  ".build",
  ".cache",
  ".git",
  ".image-cache",
  "_site",
  "coverage",
  "node_modules",
];
const WORKSPACE_IGNORED_ROOT_ENTRIES = new Set([
  ...GENERATED_ROOT_ENTRIES,
  "test",
]);

const isClientFixturePath = (relativePath) => {
  const segments = relativePath.split(path.sep);
  const extension = path.extname(relativePath);
  return (
    extension === ".md" ||
    (segments[0] === "src" &&
      (segments[1] === "images" ||
        (segments[1] === "_data" && extension === ".json"))) ||
    segments[0]?.startsWith("test-") ||
    (segments[0] === "packages" &&
      segments[1] === "js-toolkit" &&
      segments[2] === "test-utils")
  );
};

/** Copy downstream code while omitting generated files and client fixtures. */
const copyDownstreamCode = (rootDir, workspaceDir) => {
  for (const entry of fs.readdirSync(rootDir)) {
    if (WORKSPACE_IGNORED_ROOT_ENTRIES.has(entry)) continue;

    const sourcePath = path.join(rootDir, entry);
    const localPath = path.join(workspaceDir, entry);
    fs.cpSync(sourcePath, localPath, {
      recursive: true,
      filter: (source) => {
        const relativePath = path.relative(rootDir, source);
        return !isClientFixturePath(relativePath);
      },
    });
  }
};

/**
 * Copy a template-owned path when it is missing locally. Existing directories
 * are merged recursively so fixture images can supplement client images
 * without replacing them.
 */
const stageMissingPath = (templatePath, localPath, staged) => {
  if (!fs.existsSync(templatePath)) return;

  if (!fs.existsSync(localPath)) {
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.cpSync(templatePath, localPath, { recursive: true });
    staged.push(localPath);
    return;
  }

  if (!fs.statSync(templatePath).isDirectory()) return;
  if (!fs.statSync(localPath).isDirectory()) return;

  for (const entry of fs.readdirSync(templatePath)) {
    stageMissingPath(
      path.join(templatePath, entry),
      path.join(localPath, entry),
      staged,
    );
  }
};

/** Stage missing template-owned test infrastructure and return created paths. */
const stageMissingEntries = (rootDir, templateDir, entries, staged = []) => {
  for (const entry of entries) {
    stageMissingPath(
      path.join(templateDir, entry),
      path.join(rootDir, entry),
      staged,
    );
  }
  return staged;
};

const MARKDOWN_WALK_IGNORED_ROOT_ENTRIES = new Set(GENERATED_ROOT_ENTRIES);

const listTemplateMarkdown = (templateDir, relativeDir = "") =>
  fs
    .readdirSync(path.join(templateDir, relativeDir), { withFileTypes: true })
    .flatMap((entry) => {
      if (
        relativeDir === "" &&
        MARKDOWN_WALK_IGNORED_ROOT_ENTRIES.has(entry.name)
      ) {
        return [];
      }

      const relativePath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        return listTemplateMarkdown(templateDir, relativePath);
      }
      return path.extname(entry.name) === ".md" ? [relativePath] : [];
    });

/** Restore every template-owned markdown file omitted from downstream copies. */
const stageTemplateMarkdown = (templateDir, workspaceDir, staged = []) => {
  for (const relativePath of listTemplateMarkdown(templateDir)) {
    stageMissingPath(
      path.join(templateDir, relativePath),
      path.join(workspaceDir, relativePath),
      staged,
    );
  }
  return staged;
};

/** Assemble downstream code and pristine template fixtures in a temp checkout. */
const prepareHermeticWorkspace = (rootDir, templateDir, workspaceDir) => {
  copyDownstreamCode(rootDir, workspaceDir);
  stageMissingEntries(
    workspaceDir,
    templateDir,
    resolveStagingEntries(templateDir),
  );
  stageTemplateMarkdown(templateDir, workspaceDir);

  const nodeModules = path.join(rootDir, "node_modules");
  if (fs.existsSync(nodeModules)) {
    fs.symlinkSync(nodeModules, path.join(workspaceDir, "node_modules"), "dir");
  }
};

/** Remove only the files and directories stageMissingEntries created. */
const cleanupStagedEntries = (staged) => {
  for (let index = staged.length - 1; index >= 0; index--) {
    fs.rmSync(staged[index], { recursive: true, force: true });
  }
};

/** Build the env used to run the downstream test command against pristine fixtures. Pure. */
const buildHermeticEnv = (baseEnv, templateDir) => ({
  ...baseEnv,
  [FIXTURES_ROOT_ENV]: templateDir,
});

/**
 * Build a temporary checkout from downstream code and pristine fixtures, run
 * `bun test` there, then remove it. Returns the test command's exit status.
 */
const runHermeticTests = async (
  { template, forward },
  { rootDir = process.cwd(), spawnSyncFn = spawnSync } = {},
) => {
  if (!template) {
    console.error(USAGE);
    return 1;
  }

  const templateDir = path.resolve(template);
  if (!isPristineTemplateCheckout(templateDir)) {
    console.error(
      `--template ${templateDir} does not look like a chobble-template checkout ` +
        `(expected ${REQUIRED_FIXTURE_ENTRIES.join(", ")})`,
    );
    return 1;
  }

  const workspaceDir = fs.mkdtempSync(
    path.join(tmpdir(), "chobble-template-tests-"),
  );

  try {
    prepareHermeticWorkspace(rootDir, templateDir, workspaceDir);
    const env = buildHermeticEnv(process.env, templateDir);
    const result = spawnSyncFn("bun", ["test", ...forward], {
      stdio: "inherit",
      cwd: workspaceDir,
      env,
    });
    return result.status ?? 1;
  } finally {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
};

const runMainWhenDirect = async (moduleUrl, argv, exitFn = process.exit) => {
  if (moduleUrl !== pathToFileURL(path.resolve(argv[1])).href) return false;
  const { template, forward } = parseArgs(argv.slice(2));
  exitFn(await runHermeticTests({ template, forward }));
  return true;
};

export {
  buildHermeticEnv,
  cleanupStagedEntries,
  copyDownstreamCode,
  FIXTURES_ROOT_ENV,
  findTestStarEntries,
  isClientFixturePath,
  isPristineTemplateCheckout,
  parseArgs,
  prepareHermeticWorkspace,
  REQUIRED_FIXTURE_DIRECTORIES,
  REQUIRED_FIXTURE_ENTRIES,
  REQUIRED_FIXTURE_FILES,
  resolveStagingEntries,
  runHermeticTests,
  runMainWhenDirect,
  stageMissingEntries,
  stageTemplateMarkdown,
};

await runMainWhenDirect(import.meta.url, process.argv);
