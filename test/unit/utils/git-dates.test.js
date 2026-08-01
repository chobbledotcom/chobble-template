import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { withTempDirAsync } from "#test/test-utils.js";
import {
  createGitDateLookup,
  formatHuman,
  formatIso,
} from "#utils/git-dates.js";

const runGitInDir = (args, cwd, env = {}) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...process.env, ...env },
  }).trim();

const initGitRepo = (dir) => {
  runGitInDir(["init"], dir);
  runGitInDir(["config", "user.email", "test@test.com"], dir);
  runGitInDir(["config", "user.name", "Test"], dir);
};

const gitCommit = (dir, message, date = "2025-01-01T10:00:00Z") => {
  runGitInDir(["add", "-A"], dir);
  runGitInDir(["commit", "-m", message, "--allow-empty"], dir, {
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  });
};

const createLookup = (cwd) =>
  createGitDateLookup({ cwd, configuredRepo: null });

const withGitRepo =
  (testName, { fileName = "page.md", content = "content" } = {}) =>
  (testFn) =>
    withTempDirAsync(testName, async (tempDir) => {
      initGitRepo(tempDir);
      const filePath = path.join(tempDir, fileName);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
      gitCommit(tempDir, "add page");
      await testFn({ tempDir, filePath });
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
    test("returns null for null/undefined input", () =>
      withGitRepo("git-dates-empty-input")(({ tempDir }) => {
        const lookup = createLookup(tempDir);
        expect(lookup.datesFor(null)).toBe(null);
        expect(lookup.datesFor(undefined)).toBe(null);
      }));

    test("returns null for untracked file", async () => {
      await withTempDirAsync("git-dates-untracked", async (tempDir) => {
        initGitRepo(tempDir);
        gitCommit(tempDir, "initial");
        fs.writeFileSync(path.join(tempDir, "untracked.md"), "content");
        expect(createLookup(tempDir).datesFor("untracked.md")).toBe(null);
      });
    });

    test("ignores a candidate whose .git directory is invalid", async () => {
      await withTempDirAsync("git-dates-invalid-repo", async (tempDir) => {
        fs.mkdirSync(path.join(tempDir, ".git"));
        expect(createLookup(tempDir).datesFor("page.md")).toBe(null);
      });
    });

    test("returns published and updated dates for committed file", () =>
      withGitRepo("git-dates-committed", { fileName: "committed.md" })(
        ({ tempDir }) => {
          const result = createLookup(tempDir).datesFor("committed.md");
          expect(result).not.toBe(null);
          expect(result.published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
          expect(result.updated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        },
      ));

    test("updated date changes after modification", () =>
      withGitRepo("git-dates-modified", { fileName: "modified.md" })(
        ({ tempDir, filePath }) => {
          const before = createLookup(tempDir).datesFor("modified.md");

          fs.writeFileSync(filePath, "modified content");
          gitCommit(tempDir, "modify page", "2025-02-01T10:00:00Z");

          const after = createLookup(tempDir).datesFor("modified.md");
          expect(after.published).toBe(before.published);
          expect(new Date(after.updated).getTime()).toBeGreaterThan(
            new Date(before.updated).getTime(),
          );
        },
      ));

    test("returns consistent results for same path", () =>
      withGitRepo("git-dates-consistent", { fileName: "cached.md" })(
        ({ tempDir }) => {
          const lookup = createLookup(tempDir);
          const first = lookup.datesFor("cached.md");
          const second = lookup.datesFor("cached.md");
          expect(first.published).toBe(second.published);
          expect(first.updated).toBe(second.updated);
          expect(lookup.updatedFor("cached.md")).toBe(first.updated);
        },
      ));

    test("strips leading ./ from path", () =>
      withGitRepo("git-dates-dot-slash", { fileName: "dotpath.md" })(
        ({ tempDir }) => {
          expect(createLookup(tempDir).datesFor("./dotpath.md")).not.toBe(null);
        },
      ));

    test("follows renames without changing the published date", () =>
      withGitRepo("git-dates-rename", { fileName: "old.md" })(
        ({ tempDir, filePath }) => {
          const renamedPath = path.join(tempDir, "new.md");
          fs.renameSync(filePath, renamedPath);
          gitCommit(tempDir, "rename page", "2025-02-01T10:00:00Z");

          const lookup = createLookup(tempDir);
          expect(lookup.datesFor("old.md")).toEqual({
            published: "2025-01-01T10:00:00Z",
            updated: "2025-02-01T10:00:00Z",
          });
          expect(lookup.datesFor("new.md")).toEqual({
            published: "2025-01-01T10:00:00Z",
            updated: "2025-02-01T10:00:00Z",
          });
          expect(lookup.updatedFor("new.md")).toBe("2025-02-01T10:00:00Z");
        },
      ));

    test("follows copied template history", () =>
      withGitRepo("git-dates-copy", { fileName: "source.md" })(
        ({ tempDir, filePath }) => {
          fs.copyFileSync(filePath, path.join(tempDir, "copy.md"));
          gitCommit(tempDir, "copy page", "2025-02-01T10:00:00Z");

          expect(createLookup(tempDir).datesFor("copy.md")).toEqual({
            published: "2025-01-01T10:00:00Z",
            updated: "2025-02-01T10:00:00Z",
          });
        },
      ));

    test("preserves the first published date when a file is re-added", () =>
      withGitRepo("git-dates-readded", { fileName: "page.md" })(
        ({ tempDir, filePath }) => {
          fs.rmSync(filePath);
          gitCommit(tempDir, "delete page", "2025-02-01T10:00:00Z");
          fs.writeFileSync(filePath, "replacement");
          gitCommit(tempDir, "re-add page", "2025-03-01T10:00:00Z");

          expect(createLookup(tempDir).datesFor("page.md")).toEqual({
            published: "2025-01-01T10:00:00Z",
            updated: "2025-03-01T10:00:00Z",
          });
        },
      ));

    test("falls back from merged src paths to source repository paths", () =>
      withGitRepo("git-dates-src-fallback", {
        fileName: "products/page.md",
      })(({ tempDir }) => {
        expect(createLookup(tempDir).datesFor("src/products/page.md")).not.toBe(
          null,
        );
      }));
  });
});
