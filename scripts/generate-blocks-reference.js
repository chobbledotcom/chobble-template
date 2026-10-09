/** Generate the canonical block reference. Layout prose is hand-authored. */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { runIfMain } from "#scripts/lib/is-main-module.js";
import { renderBlocksReference } from "#scripts/lib/render-blocks-reference.js";

await runIfMain(import.meta.url, () => {
  const outputPath = join(
    ROOT_DIR,
    "skills/cfa-static-site-builder/references/blocks.md",
  );
  writeFileSync(outputPath, renderBlocksReference());
  console.log(`Generated block reference in ${outputPath}`);
});
