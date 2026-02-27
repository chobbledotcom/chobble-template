import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { startServer } from "#media/browser-utils.js";
import { frozenObject } from "#toolkit/fp/object.js";

/**
 * Common CLI options shared between lighthouse and screenshot tools
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
 * Parse CLI arguments with common options merged with tool-specific options
 */
export const parseCliArgs = (toolOptions) =>
  parseArgs({
    args: process.argv.slice(2),
    options: { ...COMMON_OPTIONS, ...toolOptions },
    allowPositionals: true,
  });

/**
 * Build common options object from parsed values
 */
export const buildCommonOptions = (values, outputDirDefault) => ({
  outputDir: join(process.cwd(), values["output-dir"] || outputDirDefault),
  baseUrl: values["base-url"],
  timeout: Number.parseInt(values.timeout, 10),
  outputPath: values.output,
});

export const showHelp = (usage) => {
  console.log(usage);
  process.exit(0);
};

export const logErrors = (errors, getKey) => {
  if (errors.length === 0) return false;
  console.error(`\nErrors: ${errors.length}`);
  for (const err of errors) {
    console.error(`  ${getKey(err)}: ${err.error}`);
  }
  return true;
};

export const maybeStartServer = async (siteDir, port, options) => {
  if (!siteDir) return null;
  if (!existsSync(siteDir)) {
    console.error(`Error: Directory not found: ${siteDir}`);
    process.exit(1);
  }
  console.log(`Starting server for ${siteDir} on port ${port}...`);
  const server = await startServer(siteDir, port);
  options.baseUrl = server.baseUrl;
  console.log(`Server running at ${server.baseUrl}`);
  return server;
};

export const validatePagePaths = (pagePaths, showHelpFn) => {
  if (pagePaths.length === 0) {
    console.error("Error: No page path provided");
    showHelpFn();
  }
};

export const stopServerIfRunning = (server) => {
  if (server) {
    server.stop();
    console.log("\nServer stopped.");
  }
};

export const runWithServer = async (handler, input, options, server) => {
  try {
    const hasErrors = await handler(input, options);
    if (hasErrors) process.exit(1);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  } finally {
    stopServerIfRunning(server);
  }
};

/**
 * Run a CLI tool with common boilerplate handled
 * Combines argument parsing and execution in one call
 * @param {Object} parseOptions - Tool-specific CLI options to merge with common options
 * @param {string} usage - Help text to display
 * @param {function} selectHandler - Select handler based on context
 * @param {function} getInput - Get input from context
 * @param {function} buildOptions - Build options from values: (values) => options
 * @param {function} [extraExitChecks] - Additional early exit checks (e.g., --list-*)
 */
export const runCli = async (
  parseOptions,
  usage,
  { selectHandler, getInput, buildOptions, extraExitChecks },
) => {
  const { values, positionals } = parseCliArgs(parseOptions);
  const doShowHelp = () => showHelp(usage);

  if (values.help) doShowHelp();
  if (extraExitChecks) extraExitChecks(values);

  validatePagePaths(positionals, doShowHelp);

  const options = buildOptions(values);
  const server = await maybeStartServer(
    values.serve,
    Number.parseInt(values.port, 10),
    options,
  );
  const isMultiple = values.pages || positionals.length > 1;
  const ctx = { isMultiple, values, positionals };
  const handler = selectHandler(ctx);
  const input = getInput(ctx);

  await runWithServer(handler, input, options, server);
};
