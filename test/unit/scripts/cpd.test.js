import { describe, expect, test } from "bun:test";
import {
  buildCpdDuplicateLines,
  buildCpdFailureLines,
  buildCpdFailureMessage,
  buildSourceExcerptLines,
} from "#scripts/cpd.js";

const SAMPLE_DUPLICATE = {
  format: "javascript",
  lines: 7,
  firstFile: { name: "scripts/cpd-ratchet.js", start: 47, end: 53 },
  secondFile: { name: "scripts/cpd.js", start: 42, end: 48 },
  fragment: "throw new Error(...)",
};

const SAMPLE_REPORT = { duplicates: [SAMPLE_DUPLICATE] };

describe("cpd failure guidance", () => {
  test("includes helper, curry, and ignore advice", () => {
    const message = buildCpdFailureMessage();

    expect(message).toContain("Write a helper");
    expect(message).toContain("Curry");
    expect(message).toContain("jscpd:ignore");
    expect(message).toContain("import blocks");
  });

  test("formats duplicate spans for the precommit summary", () => {
    const lines = buildCpdDuplicateLines(SAMPLE_DUPLICATE);

    expect(lines).toContain("❌ Clone found (javascript, 7 lines)");
    expect(lines).toContain("  scripts/cpd-ratchet.js: 47-53");
    expect(lines).toContain("  Duplicated lines:");
    expect(lines).toContain("  scripts/cpd.js: 42-48");
    expect(lines).toContain("  Normalized duplicate fragment:");
    expect(lines).toContain("    throw new Error(...)");
  });

  test("loads numbered source excerpts from duplicate spans", () => {
    const lines = buildSourceExcerptLines({
      name: "scripts/cpd.js",
      start: 1,
      end: 2,
    });

    expect(lines).toEqual(["    1 | #!/usr/bin/env node", "    2 | "]);
  });

  test("builds a full failure block with advice", () => {
    const lines = buildCpdFailureLines(SAMPLE_REPORT);

    expect(lines[0]).toBe("❌ jscpd found duplicated code");
    expect(lines.some((line) => line.includes("Write a helper"))).toBe(true);
    expect(lines.some((line) => line.includes("Curry"))).toBe(true);
  });
});
