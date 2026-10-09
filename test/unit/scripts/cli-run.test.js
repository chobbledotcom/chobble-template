import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  captureCliFailure,
  mockExitThrow,
  noop,
  rootDir,
} from "#test/test-utils.js";

const startServer = vi.fn(async () => ({
  baseUrl: "http://localhost:4242",
  stop: vi.fn(),
}));
vi.mock("#media/browser-utils.js", () => ({
  startServer: (...args) => startServer(...args),
}));

const { runCli, runCliWhenMain, stringListValue } = await import(
  "#scripts/cli-utils.js"
);

const ORIGINAL_ARGV = [...process.argv];
const setArgv = (...args) => {
  process.argv.splice(
    0,
    process.argv.length,
    ...ORIGINAL_ARGV.slice(0, 2),
    ...args,
  );
};

// Minimal tool wiring: no extra options, handler records what it was given.
const makeHandlers = (handlerResult = false) => {
  const handler = vi.fn(async () => handlerResult);
  return {
    handler,
    handlers: {
      selectHandler: () => handler,
      getInput: ({ positionals }) => positionals[0],
      buildOptions: () => ({ built: true }),
      extraExitChecks: vi.fn(),
    },
  };
};

afterEach(() => {
  process.argv.splice(0, process.argv.length, ...ORIGINAL_ARGV);
  process.exitCode = 0;
});

describe("stringListValue", () => {
  test("passes string arrays through and drops scalars", () => {
    expect(stringListValue(["a", "b"])).toEqual(["a", "b"]);
    expect(stringListValue("a")).toEqual([]);
    expect(stringListValue(undefined)).toEqual([]);
  });
});

// Run the tool CLI with stub handlers, capturing the failure it prints.
const runCliExpectingFailure = () =>
  captureCliFailure(() => runCli({}, "tool usage", makeHandlers().handlers));

describe("runCli", () => {
  test("prints usage and exits 0 for --help", async () => {
    setArgv("--help");
    const exitSpy = mockExitThrow();
    const logSpy = vi.spyOn(console, "log").mockImplementation(noop);

    await expect(
      runCli({}, "tool usage", makeHandlers().handlers),
    ).rejects.toThrow("exit:0");
    expect(logSpy).toHaveBeenCalledWith("tool usage");
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("rejects a call with no page path via usageError", async () => {
    setArgv();

    const { errors, exitError } = await runCliExpectingFailure();

    expect(exitError).toBe("exit:1");
    expect(errors).toContain("Error: No page path provided");
  });

  test("rejects --serve with a missing directory", async () => {
    setArgv("--serve", "definitely-missing-dir", "/");

    const { errors, exitError } = await runCliExpectingFailure();

    expect(exitError).toBe("exit:1");
    expect(errors.join("\n")).toContain("Directory not found");
  });

  test("runs the selected handler with built options and input", async () => {
    setArgv("/news/");
    const { handler, handlers } = makeHandlers(false);

    await runCli({}, "tool usage", handlers);

    expect(handlers.extraExitChecks).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith("/news/", { built: true });
    expect(process.exitCode).toBe(0);
  });

  test("starts and stops the dev server for --serve, failing on handler errors", async () => {
    setArgv("--serve", rootDir, "--port", "4242", "/");
    const logSpy = vi.spyOn(console, "log").mockImplementation(noop);
    const { handler, handlers } = makeHandlers(true);

    await runCli({}, "tool usage", handlers);

    expect(startServer).toHaveBeenCalledWith(rootDir, 4242);
    expect(handler).toHaveBeenCalledWith(
      "/",
      expect.objectContaining({ baseUrl: "http://localhost:4242" }),
    );
    const server = await startServer.mock.results.at(-1).value;
    expect(server.stop).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    logSpy.mockRestore();
  });
});

describe("runCliWhenMain", () => {
  test("does nothing when the module is not the entry point", async () => {
    const { handler, handlers } = makeHandlers();

    await runCliWhenMain("file:///not/the/entry.js", {}, "usage", handlers);

    expect(handler).not.toHaveBeenCalled();
  });

  test("runs the CLI when the module is the entry point", async () => {
    setArgv("/about/");
    const { handler, handlers } = makeHandlers();

    await runCliWhenMain(
      pathToFileURL(process.argv[1]).href,
      {},
      "usage",
      handlers,
    );

    expect(handler).toHaveBeenCalledWith("/about/", { built: true });
  });
});
