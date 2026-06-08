import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { withTempDirAsync } from "#test/test-utils.js";
import {
  clearCache,
  datesFor,
  formatHuman,
  formatIso,
} from "#utils/git-dates.js";

const runGit = (args, cwd) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();

const initGitRepo = (dir) => {
  runGit(["init"], dir);
  runGit(["config", "user.email", "test@test.com"], dir);
  runGit(["config", "user.name", "Test"], dir);
};

const gitCommit = (dir, message) => {
  runGit(["add", "-A"], dir);
  runGit(["commit", "-m", message, "--allow-empty"], dir);
};

const withGitRepo =
  (testName, { fileName = "page.md", content = "content" } = {}) =>
  (testFn) =>
    withTempDirAsync(testName, async (tempDir) => {
      initGitRepo(tempDir);
      const filePath = path.join(tempDir, fileName);
      fs.writeFileSync(filePath, content);
      gitCommit(tempDir, "add page");

      const originalCwd = process.cwd();
      try {
        process.chdir(tempDir);
        clearCache();
        await testFn({ tempDir, filePath });
      } finally {
        process.chdir(originalCwd);
      }
    });

describe("git-dates", () => {
  describe("formatHuman", () => {
    test("formats ISO date to human-readable en-GB format", () => {
      expect(formatHuman("2025-01-06T12:00:00+00:00")).toBe("6 January 2025");
    });

    test("returns empty string for null/undefined", () => {
      expect(formatHuman(null)).toBe("");
      expect(formatHuman(undefined)).toBe("");
      expect(formatHuman("")).toBe("");
    });
  });

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

        const originalCwd = process.cwd();
        try {
          process.chdir(tempDir);
          clearCache();
          expect(datesFor("untracked.md")).toBe(null);
        } finally {
          process.chdir(originalCwd);
        }
      });
    });

    test("returns published and updated dates for committed file", () =>
      withGitRepo("git-dates-committed")(({ filePath }) => {
        const result = datesFor("page.md");
        expect(result).not.toBe(null);
        expect(result.published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(result.updated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }));

    test("updated date changes after modification", () =>
      withGitRepo("git-dates-modified")(({ tempDir, filePath }) => {
        const before = datesFor("page.md");

        fs.writeFileSync(filePath, "modified content");
        gitCommit(tempDir, "modify page");
        clearCache();

        const after = datesFor("page.md");
        expect(after.published).toBe(before.published);
        expect(new Date(after.updated).getTime()).toBeGreaterThanOrEqual(
          new Date(before.updated).getTime(),
        );
      }));

    test("caches results for same path", () =>
      withGitRepo("git-dates-cache")(() => {
        const first = datesFor("page.md");
        const second = datesFor("page.md");
        expect(first).toBe(second);
      }));

    test("strips leading ./ from path", () =>
      withGitRepo("git-dates-dot-slash")(() => {
        expect(datesFor("./page.md")).not.toBe(null);
      }));
  });
});
