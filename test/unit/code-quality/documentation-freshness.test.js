import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { rootDir } from "#test/test-utils.js";

test("committed documentation matches source inputs without rewriting references", async () => {
  // Snapshot both files before either renderer or CLI can have import effects.
  const committed = [
    "skills/cfa-static-site-builder/references/blocks.md",
    "docs/developer-reference.md",
  ].map((target) => {
    const path = join(rootDir, target);
    return {
      path,
      content: readFileSync(path, "utf8"),
      mtime: statSync(path, { bigint: true }).mtimeNs,
    };
  });
  vi.resetModules();
  const { renderBlocksReference } = await import(
    "#scripts/lib/render-blocks-reference.js"
  );
  const { readDeveloperReferenceInputs, renderDeveloperReference } =
    await import("#scripts/generate-developer-reference.js");
  const generated = [
    renderBlocksReference(),
    renderDeveloperReference(readDeveloperReferenceInputs()),
  ];

  for (const [index, { path, content, mtime }] of committed.entries()) {
    expect(readFileSync(path, "utf8"), `${path} must not be rewritten`).toBe(
      content,
    );
    expect(statSync(path, { bigint: true }).mtimeNs, path).toBe(mtime);
    expect(generated[index], `${path}: Run npm run generate-references`).toBe(
      content,
    );
  }
  // Re-imports the reference generator graphs under coverage instrumentation;
  // under the full suite's parallel lanes that exceeds the default timeout
}, 5000);
