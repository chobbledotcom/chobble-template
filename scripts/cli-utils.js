import { existsSync } from "node:fs";
import { startServer } from "#media/browser-utils.js";

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

export const createCliRunner =
  ({ selectHandler, getInput, buildOptions, handleEarlyExit, doShowHelp }) =>
  async (values, positionals) => {
    handleEarlyExit();
    validatePagePaths(positionals, doShowHelp);

    const options = buildOptions();
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
