import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { captureConsole, rootDir } from "#test/test-utils.js";

// Each test re-imports the reference generator graphs with fs mocks under
// coverage instrumentation; under the full suite's parallel lanes that
// exceeds the default timeout.
vi.setConfig({ testTimeout: 5000 });

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal();
  const mocked = {
    readFileSync: vi.fn(original.readFileSync),
    readdirSync: vi.fn(original.readdirSync),
    writeFileSync: vi.fn(),
  };
  return {
    ...original,
    ...mocked,
    default: { ...original.default, ...mocked },
  };
});

const generators = [
  {
    script: "generate-blocks-reference.js",
    target: "skills/cfa-static-site-builder/references/blocks.md",
    load: () => import("#scripts/generate-blocks-reference.js"),
    render: async () => {
      const { renderBlocksReference } = await import(
        "#scripts/lib/render-blocks-reference.js"
      );
      return renderBlocksReference();
    },
  },
  {
    script: "generate-developer-reference.js",
    target: "docs/developer-reference.md",
    load: () => import("#scripts/generate-developer-reference.js"),
    render: async () => {
      const { readDeveloperReferenceInputs, renderDeveloperReference } =
        await import("#scripts/generate-developer-reference.js");
      return renderDeveloperReference(readDeveloperReferenceInputs());
    },
  },
];

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.doUnmock("#scripts/lib/is-main-module.js");
  vi.restoreAllMocks();
});

describe.each(generators)("$script CLI", ({ script, target, load, render }) => {
  test("fresh import respects filesystem safety with the real entry-point guard", async () => {
    await load();
    expect(writeFileSync).not.toHaveBeenCalled();
    if (script === "generate-developer-reference.js") {
      expect(readFileSync).not.toHaveBeenCalled();
      expect(readdirSync).not.toHaveBeenCalled();
    }
  });

  test("the guarded callback writes the newline-terminated rendered reference", async () => {
    const guard = vi.fn();
    vi.doMock("#scripts/lib/is-main-module.js", () => ({ runIfMain: guard }));
    await load();
    const [[url, main]] = guard.mock.calls;
    expect(new URL(url).pathname).toBe(join(rootDir, "scripts", script));
    captureConsole(main);
    const output = await render();
    expect(output.match(/\n+$/)?.[0]).toBe("\n");
    expect(writeFileSync).toHaveBeenCalledExactlyOnceWith(
      join(rootDir, target),
      output,
    );
  });
});
