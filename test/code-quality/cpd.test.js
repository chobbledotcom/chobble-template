import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createTestRunner,
  expectStrictEqual,
  rootDir,
} from "#test/test-utils.js";

const baselinePath = resolve(rootDir, ".jscpd_baseline.json");
const reportPath = resolve(rootDir, ".jscpd-report", "jscpd-report.json");

function readBaseline() {
  const content = readFileSync(baselinePath, "utf-8");
  return JSON.parse(content);
}

function writeBaseline(baseline) {
  const content = `${JSON.stringify(baseline, null, "\t")}\n`;
  writeFileSync(baselinePath, content, "utf-8");
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

const testCases = [
  {
    name: "duplication-within-baseline",
    description: "code duplication stays within baseline threshold",
    test: () => {
      const baseline = readBaseline();

      const result = spawnSync("pnpm", ["cpd"], {
        cwd: rootDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const report = JSON.parse(readFileSync(reportPath, "utf-8"));
      const actual = round2(report.statistics.total.percentageTokens);
      const limit = baseline.percentageTokens;

      if (actual > limit) {
        console.log("\n  Duplication exceeds baseline:\n");
        console.log(result.stdout || result.stderr);
        console.log(
          `\n  Baseline: ${limit}% | Actual: ${actual}%\n` +
            "  Reduce duplication to proceed.\n",
        );
      }

      expectStrictEqual(
        actual <= limit,
        true,
        `Code duplication ${actual}% exceeds baseline ${limit}%. ` +
          "Run 'pnpm cpd' to see details.",
      );

      // Ratchet down if duplication decreased
      if (actual < limit) {
        const newBaseline = { percentageTokens: actual };
        writeBaseline(newBaseline);
        console.log(
          `\n  📉 Duplication baseline updated: ${limit}% → ${actual}%\n`,
        );
      }
    },
  },
];

createTestRunner("cpd", testCases);
