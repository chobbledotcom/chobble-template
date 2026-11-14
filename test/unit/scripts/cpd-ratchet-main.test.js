import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal();
  const readFileSync = vi.fn(original.readFileSync);
  return {
    ...original,
    readFileSync,
    default: { ...original.default, readFileSync },
  };
});

const runJscpd = vi.fn();
const loadCpdDuplicates = vi.fn();
vi.mock("#scripts/cpd.js", () => ({
  runJscpd: (...args) => runJscpd(...args),
  loadCpdDuplicates: (...args) => loadCpdDuplicates(...args),
}));

const { configMinTokens, main, readConfigMinTokens } = await import(
  "#scripts/cpd-ratchet.js"
);
const { captureCliFailure, noop, rootDir } = await import(
  "#test/test-utils.js"
);

const strictOutputDir = join(rootDir, ".jscpd-report", "ratchet");
const strictReport = join(strictOutputDir, "jscpd-report.json");
const configOutputDir = join(rootDir, ".jscpd-report", "ratchet-config");
const configReport = join(configOutputDir, "jscpd-report.json");

const expectRatchetFailure = async (expectedMessage) => {
  const { errors, exitError } = await captureCliFailure(main);
  expect(exitError).toBe("exit:1");
  expect(errors.join("\n")).toContain(expectedMessage);
};

describe("cpd-ratchet main", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  test("fails when the strict scan passes at a stricter threshold", async () => {
    runJscpd.mockReturnValueOnce(0);

    await expectRatchetFailure(
      "Update --min-tokens in the package.json cpd script",
    );
  });

  test("fails when the config-driven scan passes at a stricter threshold", async () => {
    runJscpd.mockReturnValueOnce(1); // strict scan still finds duplication
    loadCpdDuplicates.mockReturnValueOnce([{}]);
    runJscpd.mockReturnValueOnce(0); // config scan is clean one notch lower

    await expectRatchetFailure("Update minTokens in .jscpd.json");
  });

  test("passes when duplication appears one notch lower on both scans", () => {
    vi.mocked(readFileSync)
      .mockClear()
      .mockReturnValueOnce(
        JSON.stringify({
          scripts: {
            cpd: "node scripts/cpd.js && node scripts/cpd.js src/_lib scripts --min-tokens 18 --ignore '**/index.js,**/mutation/**' --ignore-pattern 'import.*from'",
          },
        }),
      )
      .mockReturnValueOnce(JSON.stringify({ minTokens: 7 }));
    runJscpd.mockReturnValue(1);
    loadCpdDuplicates.mockReturnValueOnce([{}]).mockReturnValueOnce([{}, {}]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(noop);

    main();

    expect(runJscpd).toHaveBeenCalledTimes(2);
    expect(runJscpd).toHaveBeenNthCalledWith(
      1,
      [
        "src/_lib",
        "scripts",
        "--min-tokens",
        "17",
        "--ignore",
        "**/index.js,**/mutation/**",
        "--ignore-pattern",
        "import.*from",
        "--silent",
        "--output",
        strictOutputDir,
      ],
      strictReport,
    );
    expect(runJscpd).toHaveBeenNthCalledWith(
      2,
      ["--min-tokens", "6", "--silent", "--output", configOutputDir],
      configReport,
    );
    expect(readFileSync.mock.calls).toEqual([
      [join(rootDir, "package.json"), "utf-8"],
      [join(rootDir, ".jscpd.json"), "utf-8"],
    ]);
    expect(loadCpdDuplicates.mock.calls).toEqual([
      [strictReport],
      [configReport],
    ]);
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        "CPD ratchet passed: min-tokens 18 is as strict as the code allows (1 clone(s) appear one notch lower)",
      ),
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        "CPD ratchet passed: config min-tokens 7 is as strict as the code allows (2 clone(s) appear one notch lower)",
      ),
    );
  });

  test("propagates config scan report load errors instead of passing", () => {
    const reportError = new Error("Config scan wrote no report");
    runJscpd.mockReturnValue(1);
    loadCpdDuplicates.mockReturnValueOnce([{}]).mockImplementationOnce(() => {
      throw reportError;
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(noop);

    expect(main).toThrow(reportError);

    expect(loadCpdDuplicates).toHaveBeenLastCalledWith(configReport);
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("CPD ratchet passed: config"),
    );
  });

  test.each([
    "32",
    undefined,
    null,
    -1,
    0,
    1,
    2.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])("configMinTokens rejects invalid minTokens %s", (minTokens) => {
    expect(() => configMinTokens({ minTokens })).toThrow(
      /must record an integer minTokens/,
    );
  });

  test("configMinTokens accepts the minimum threshold of 2", () => {
    expect(configMinTokens({ minTokens: 2 })).toBe(2);
  });

  test("readConfigMinTokens reports the committed config threshold", () => {
    const config = JSON.parse(
      readFileSync(join(rootDir, ".jscpd.json"), "utf-8"),
    );

    expect(readConfigMinTokens()).toBe(config.minTokens);
  });
});
