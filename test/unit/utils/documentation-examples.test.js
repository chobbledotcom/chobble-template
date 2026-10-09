import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { ROOT_DIR } from "#lib/paths.js";
import {
  extractDocumentationExamples,
  getDocumentationFiles,
} from "#test/test-utils.js";
import { collectBlockErrors } from "#utils/block-schema.js";

const blockExamples = getDocumentationFiles().flatMap((file) =>
  extractDocumentationExamples(
    file,
    readFileSync(join(ROOT_DIR, file), "utf8"),
  ),
);

describe("documented YAML block examples", () => {
  test("discovers skill examples without revalidating the generated canonical catalog", () => {
    expect(
      blockExamples.some(({ location }) =>
        location.includes("references/content-authoring.md"),
      ),
    ).toBe(true);
    expect(
      blockExamples.some(({ location }) =>
        location.includes("references/blocks.md"),
      ),
    ).toBe(false);
  });
  test.each(
    blockExamples,
  )("$location validates against the production schema", ({
    location,
    blocks,
  }) => {
    expect(Array.isArray(blocks), location).toBe(true);
    expect(collectBlockErrors(blocks, ` in ${location}`)).toEqual([]);
  });
});
