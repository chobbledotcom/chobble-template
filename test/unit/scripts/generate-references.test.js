import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { rootDir, withTempDir } from "#test/test-utils.js";

const stages = [
  "generate-blocks-reference",
  "generate-pages-yml",
  "generate-developer-reference",
];

test.each([
  { failure: "none", dispatched: stages, status: 0 },
  { failure: stages[0], dispatched: stages.slice(0, 1), status: 23 },
  { failure: stages[1], dispatched: stages.slice(0, 2), status: 23 },
  { failure: stages[2], dispatched: stages, status: 23 },
])("aggregate dispatch order and exit status when failure is $failure", ({
  failure,
  dispatched,
  status,
}) => {
  withTempDir("generate-references", (dir) => {
    const { scripts } = JSON.parse(
      readFileSync(join(rootDir, "package.json"), "utf8"),
    );
    // Only the mock npm is on PATH; no real generator can mutate the checkout.
    writeFileSync(
      join(dir, "npm"),
      `#!${process.execPath}
import { appendFileSync } from "node:fs";
appendFileSync("calls", process.argv.slice(2).join(" ") + "\\n");
process.exit(process.argv[3] === process.env.FAIL_SCRIPT ? 23 : 0);
`,
      { mode: 0o755 },
    );
    const result = spawnSync(scripts["generate-references"], {
      shell: true,
      cwd: dir,
      env: { PATH: dir, FAIL_SCRIPT: failure },
      encoding: "utf8",
    });

    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(status);
    expect(readFileSync(join(dir, "calls"), "utf8").trim().split("\n")).toEqual(
      dispatched.map((stage) => `run ${stage}`),
    );
  });
});
