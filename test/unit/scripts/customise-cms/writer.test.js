import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createEmptyConfig } from "#scripts/customise-cms/config.js";
import {
  runWithErrorHandling,
  writeCmsArtifacts,
} from "#scripts/customise-cms/writer.js";
import { withTempDirAsync } from "#test/test-utils.js";

const { generateTypeDefinitions } = vi.hoisted(() => ({
  generateTypeDefinitions: vi.fn(() => "generated types\n"),
}));

vi.mock("#scripts/generate-pages-cms-types.js", () => ({
  generateTypeDefinitions,
}));

afterEach(() => vi.restoreAllMocks());

describe("writeCmsArtifacts", () => {
  test("writes Pages CMS YAML and its generated type declarations together", async () =>
    withTempDirAsync("cms-artifacts", async (tempDir) => {
      const outputPaths = {
        pagesYaml: join(tempDir, ".pages.yml"),
        cmsTypes: join(tempDir, "pages-cms-generated.d.ts"),
      };

      await writeCmsArtifacts(createEmptyConfig(), outputPaths);

      await expect(readFile(outputPaths.pagesYaml, "utf8")).resolves.toContain(
        "media:",
      );
      await expect(readFile(outputPaths.cmsTypes, "utf8")).resolves.toBe(
        "generated types\n",
      );
      expect(generateTypeDefinitions).toHaveBeenCalledWith(
        expect.stringContaining("media:"),
      );
    }));
});

describe("runWithErrorHandling", () => {
  test("reports a rejected main function and exits non-zero", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined);

    runWithErrorHandling(() => Promise.reject(new Error("broken")));

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
    expect(error).toHaveBeenCalledWith("Error:", "broken");
  });
});
