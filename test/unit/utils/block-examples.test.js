/**
 * Every block type ships a canonical example: valid against its own schema,
 * round-trippable through YAML, and rendered live on the /blocks/ gallery
 * page. These tests keep that guarantee honest.
 */

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";
import { parse } from "yaml";
import { getFiles, rootDir } from "#test/test-utils.js";
import { buildGalleryBlocks } from "#utils/block-gallery.js";
import {
  BLOCK_EXAMPLES,
  BLOCK_SCHEMAS,
  collectBlockErrors,
} from "#utils/block-schema.js";

describe("block examples", () => {
  test("the registry contains every block module exactly once", async () => {
    const files = getFiles(/^src\/_lib\/utils\/block-schema\/[^/]+\.js$/);
    const modules = await Promise.all(
      files.map((file) => import(pathToFileURL(join(rootDir, file)).href)),
    );
    // Shared field factories have no type; every concrete block module does.
    const types = modules
      .filter((module) => Object.hasOwn(module, "type"))
      .map((module) => module.type);
    expect(types.length).toBeGreaterThan(0);
    expect(types.toSorted()).toEqual(Object.keys(BLOCK_SCHEMAS).toSorted());
  });

  test("every registered block type has an example of its own type", () => {
    expect(BLOCK_EXAMPLES.length).toBe(Object.keys(BLOCK_SCHEMAS).length);
    for (const { type, example } of BLOCK_EXAMPLES) {
      expect(
        example,
        `block type "${type}" is missing an example`,
      ).toBeTruthy();
      expect(example.type).toBe(type);
    }
  });

  test.each(
    BLOCK_EXAMPLES.map(({ type, example }) => [type, example]),
  )("the %s example validates against its schema", (type, example) => {
    expect(collectBlockErrors([example], ` (${type} example)`)).toEqual([]);
  });
});

describe("buildGalleryBlocks", () => {
  const gallery = buildGalleryBlocks();

  test("opens with a hero and emits one section per block type", () => {
    expect(gallery[0].type).toBe("hero");
    // Each type gets exactly one code-block whose intro_content carries the
    // backticked type name as the section title.
    const intros = gallery.filter(
      (b) =>
        b.type === "code-block" &&
        b.filename?.endsWith(".yaml") &&
        b.intro_content?.startsWith("## `"),
    );
    expect(intros.length).toBe(BLOCK_EXAMPLES.length);
  });

  test("the whole gallery is itself a valid blocks array", () => {
    expect(collectBlockErrors(gallery, " (gallery)")).toEqual([]);
  });

  test("each YAML source round-trips to the example it documents", () => {
    const sources = gallery.filter((b) => b.type === "code-block");
    const byFilename = Object.fromEntries(
      sources.map((b) => [b.filename, b.code]),
    );
    for (const { type, example } of BLOCK_EXAMPLES) {
      const code = byFilename[`${type}.yaml`];
      expect(code, `no YAML source emitted for "${type}"`).toBeTruthy();
      expect(parse(code)).toEqual({ blocks: [example] });
    }
  });

  test("collection-restricted blocks get a note instead of a live preview", () => {
    const restricted = BLOCK_EXAMPLES.filter((e) => e.collections);
    expect(restricted.length).toBeGreaterThan(0);
    for (const { type } of restricted) {
      const rendered = gallery.some((b) => b.type === type);
      expect(rendered, `restricted "${type}" should not render`).toBe(false);
    }
    const notes = gallery.filter((b) => b.name === "Rendered in context");
    expect(notes.length).toBe(restricted.length);
  });
});
