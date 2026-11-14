import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import { withChdirAsync, withTempDirAsync } from "#test/test-utils.js";
import { datesFor, formatIso } from "#utils/git-dates.js";

// These tests run real git subprocesses, which can far exceed the global
// 1.5s testTimeout when the full suite's lanes load the machine.
vi.setConfig({ testTimeout: 15_000 });

const runGitInDir = (args, cwd) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();

const initGitRepo = (dir) => {
  runGitInDir(["init"], dir);
  runGitInDir(["config", "user.email", "test@test.com"], dir);
  runGitInDir(["config", "user.name", "Test"], dir);
};

const gitCommit = (dir, message) => {
  runGitInDir(["add", "-A"], dir);
  runGitInDir(["commit", "-m", message, "--allow-empty"], dir);
};

const withGitRepo =
  (testName, { fileName = "page.md", content = "content" } = {}) =>
  (testFn) =>
    withTempDirAsync(testName, async (tempDir) => {
      initGitRepo(tempDir);
      const filePath = path.join(tempDir, fileName);
      fs.writeFileSync(filePath, content);
      gitCommit(tempDir, "add page");

      await withChdirAsync(tempDir, () => testFn({ tempDir, filePath }));
    });

describe("git-dates", () => {
  describe("formatIso", () => {
    test("formats ISO date to YYYY-MM-DD", () => {
      expect(formatIso("2025-01-06T12:00:00+00:00")).toBe("2025-01-06");
    });

    test("returns empty string for null/undefined", () => {
      expect(formatIso(null)).toBe("");
      expect(formatIso(undefined)).toBe("");
      expect(formatIso("")).toBe("");
    });
  });

  describe("datesFor", () => {
    test("returns null for null/undefined input", () => {
      expect(datesFor(null)).toBe(null);
      expect(datesFor(undefined)).toBe(null);
    });

    test("returns null for untracked file", async () => {
      await withTempDirAsync("git-dates-untracked", async (tempDir) => {
        initGitRepo(tempDir);
        gitCommit(tempDir, "initial");
        fs.writeFileSync(path.join(tempDir, "untracked.md"), "content");

        await withChdirAsync(tempDir, () => {
          expect(datesFor("untracked.md")).toBe(null);
        });
      });
    });

    test("returns published and updated dates for committed file", () =>
      withGitRepo("git-dates-committed", { fileName: "committed.md" })(() => {
        const result = datesFor("committed.md");
        expect(result).not.toBe(null);
        expect(result.published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(result.updated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }));

    test("updated date changes after modification", () =>
      withGitRepo("git-dates-modified", { fileName: "modified.md" })(
        ({ tempDir, filePath }) => {
          const before = datesFor("modified.md");

          fs.writeFileSync(filePath, "modified content");
          gitCommit(tempDir, "modify page");

          const after = datesFor("modified.md");
          expect(after.published).toBe(before.published);
          expect(new Date(after.updated).getTime()).toBeGreaterThanOrEqual(
            new Date(before.updated).getTime(),
          );
        },
      ));

    test("returns consistent results for same path", () =>
      withGitRepo("git-dates-consistent", { fileName: "cached.md" })(() => {
        const first = datesFor("cached.md");
        const second = datesFor("cached.md");
        expect(first.published).toBe(second.published);
        expect(first.updated).toBe(second.updated);
      }));

    test("strips leading ./ from path", () =>
      withGitRepo("git-dates-dot-slash", { fileName: "dotpath.md" })(() => {
        expect(datesFor("./dotpath.md")).not.toBe(null);
      }));
  });
});
