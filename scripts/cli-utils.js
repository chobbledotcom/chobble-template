import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { startServer } from "#media/browser-utils.js";
import { runIfMain } from "#scripts/lib/is-main-module.js";
import { frozenObject } from "#utils/fp/object.js";

/**
 * @typedef {{ [key: string]: string | boolean | (string | boolean)[] | undefined }} CliValues
 * @typedef {{ isMultiple: boolean, values: CliValues, positionals: string[] }} CliContext
 *
 * @typedef {Object} CliHandlers
 * @property {(ctx: CliContext) => (input: *, options: *) => Promise<boolean>} selectHandler - Pick the handler for this invocation
 * @property {(ctx: CliContext) => *} getInput - Derive the handler input from the parsed context
 * @property {(values: CliValues) => Object} buildOptions - Build handler options from parsed values
 * @property {(values: CliValues) => void} [extraExitChecks] - Early exits (e.g. --list-*)
 */

/**
 * Common CLI options shared between lighthouse and screenshot tools
 * @type {import("node:util").ParseArgsConfig["options"]}
 */
const COMMON_OPTIONS = frozenObject({
  help: { type: "boolean", short: "h" },
  output: { type: "string", short: "o" },
  "base-url": {
    type: "string",
    short: "u",
    default: "http://localhost:8080",
  },
  timeout: { type: "string", short: "t", default: "10000" },
  pages: { type: "boolean", short: "p" },
  serve: { type: "string", short: "s" },
  port: { type: "string", default: "8080" },
});

/**
 * Help lines for COMMON_OPTIONS, interpolated into every tool's usage
 * text. Kept next to the option definitions so the two never drift.
 * (`--pages` is documented per tool - its description names what the
 * tool does with multiple pages.)
 */
export const COMMON_OPTIONS_HELP = `  -h, --help              Show this help message
  -o, --output <path>     Output file path (auto-generated if not specified)
  -u, --base-url <url>    Base URL (default: http://localhost:8080)
  -t, --timeout <ms>      Timeout in milliseconds (default: 10000)
  -s, --serve <dir>       Start a server for the given directory
  --port <port>           Port for the server (default: 8080)`;

/**
 * Parse CLI arguments with common options merged with tool-specific options
 * @param {import("node:util").ParseArgsConfig["options"]} toolOptions
 */
const parseCliArgs = (toolOptions) =>
  parseArgs({
    args: process.argv.slice(2),
    options: { ...COMMON_OPTIONS, ...toolOptions },
    allowPositionals: true,
  });

/**
 * Build common options object from parsed values.
 * The output dir resolves against the invoker's cwd on purpose: a relative
 * -d is expected to land where the user ran the command. Absolute paths
 * pass through unchanged.
 * @param {CliValues} values
 */
const buildCommonOptions = (values) => ({
  outputDir: resolve(process.cwd(), String(values["output-dir"])),
  baseUrl: values["base-url"],
  timeout: Number.parseInt(String(values.timeout), 10),
  outputPath: values.output,
});

/**
 * Create a tool's buildOptions handler: the common options merged with
 * the tool-specific ones derived from the same parsed values.
 * @param {(values: CliValues) => Object} extra
 * @returns {(values: CliValues) => Object}
 */
export const optionsBuilder = (extra) => (values) => ({
  ...buildCommonOptions(values),
  ...extra(values),
});

/**
 * Narrow a parseArgs `multiple: true` string option to a string array
 * (undefined when the flag was never passed).
 * @param {CliValues[string]} value
 * @returns {string[]}
 */
export const stringListValue = (value) =>
  Array.isArray(value) ? value.map(String) : [];

/**
 * Print usage and exit 0 — the -h/--help path.
 * @param {string} usage
 */
const showHelp = (usage) => {
  console.log(usage);
  process.exit(0);
};

/**
 * Report a usage error and exit non-zero so wrappers see the failure.
 * @param {string} message
 * @param {string} usage
 */
export const usageError = (message, usage) => {
  console.error(`Error: ${message}`);
  console.error(usage);
  process.exit(1);
};

/**
 * @param {Array<{ error: unknown }>} errors
 * @param {(err: any) => string} getKey
 */
export const logErrors = (errors, getKey) => {
  if (errors.length === 0) return false;
  console.error(`\nErrors: ${errors.length}`);
  for (const err of errors) {
    console.error(`  ${getKey(err)}: ${err.error}`);
  }
  return true;
};

/**
 * Start a dev server for siteDir when one was requested.
 * @param {string | undefined} siteDir
 * @param {number} port
 * @param {string} usage
 * @returns {Promise<{ baseUrl: string, stop: () => void } | null>}
 */
const maybeStartServer = async (siteDir, port, usage) => {
  if (!siteDir) return null;
  if (!existsSync(siteDir)) {
    usageError(`Directory not found: ${siteDir}`, usage);
  }
  console.log(`Starting server for ${siteDir} on port ${port}...`);
  const server = await startServer(siteDir, port);
  console.log(`Server running at ${server.baseUrl}`);
  return server;
};

/** @param {{ baseUrl: string, stop: () => void } | null} server */
const stopServerIfRunning = (server) => {
  if (server) {
    server.stop();
    console.log("\nServer stopped.");
  }
};

/**
 * Parse the CLI invocation, honouring the early exits (help, --list-*),
 * and reject a call with no page path.
 * @param {import("node:util").ParseArgsConfig["options"]} parseOptions
 * @param {string} usage
 * @param {CliHandlers["extraExitChecks"]} extraExitChecks
 */
const parseInvocation = (parseOptions, usage, extraExitChecks) => {
  const { values, positionals } = parseCliArgs(parseOptions);

  if (values.help) showHelp(usage);
  if (extraExitChecks) extraExitChecks(values);
  if (positionals.length === 0) {
    usageError("No page path provided", usage);
  }
  return { values, positionals };
};

/**
 * Run a CLI tool with common boilerplate handled.
 * A handler resolves to `true` when it saw errors (exit 1); a thrown error
 * propagates with its stack and fails the process — no masking.
 * @param {import("node:util").ParseArgsConfig["options"]} parseOptions - Tool-specific CLI options
 * @param {string} usage - Help text to display
 * @param {CliHandlers} handlers
 */
export const runCli = async (parseOptions, usage, handlers) => {
  const { selectHandler, getInput, buildOptions, extraExitChecks } = handlers;
  const { values, positionals } = parseInvocation(
    parseOptions,
    usage,
    extraExitChecks,
  );

  const server = await maybeStartServer(
    typeof values.serve === "string" ? values.serve : undefined,
    Number.parseInt(String(values.port), 10),
    usage,
  );
  const options = {
    ...buildOptions(values),
    ...(server && { baseUrl: server.baseUrl }),
  };
  const isMultiple = Boolean(values.pages) || positionals.length > 1;
  const ctx = { isMultiple, values, positionals };

  try {
    const hasErrors = await selectHandler(ctx)(getInput(ctx), options);
    if (hasErrors) process.exitCode = 1;
  } finally {
    stopServerIfRunning(server);
  }
};

/**
 * Standard tail for a CLI tool module: run its CLI only when the module
 * is the process entry point, so importing the module for its exports
 * never triggers argument parsing.
 * @param {string} importMetaUrl - The tool module's import.meta.url
 * @param {import("node:util").ParseArgsConfig["options"]} parseOptions
 * @param {string} usage
 * @param {CliHandlers} handlers
 */
export const runCliWhenMain = (importMetaUrl, parseOptions, usage, handlers) =>
  runIfMain(importMetaUrl, () => runCli(parseOptions, usage, handlers));
