import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { withTempDirAsync } from "#test/test-utils.js";
import {
  createGitDateLookup,
  formatHuman,
  formatIso,
} from "#utils/git-dates.js";

function runGitInDir(args, cwd, env = {}) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...process.env, ...env },
  }).trim();
}

const initGitRepo = (dir) => {
  runGitInDir(["init", "-b", "main"], dir);
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

    test("keeps the original publish date when a template is renamed from a non-template path", () =>
      withGitRepo("git-dates-cross-extension-rename", {
        fileName: "page.njk",
      })(({ tempDir, filePath }) => {
        const renamedPath = path.join(tempDir, "page.liquid");
        fs.renameSync(filePath, renamedPath);
        gitCommit(tempDir, "migrate to liquid", "2025-02-01T10:00:00Z");

        const lookup = createLookup(tempDir);
        expect(lookup.datesFor("page.liquid")).toEqual({
          published: "2025-01-01T10:00:00Z",
          updated: "2025-02-01T10:00:00Z",
        });
      }));

    test("backfills the oldest publish date through a rename chain from a non-template path", () =>
      withGitRepo("git-dates-rename-chain", { fileName: "page.txt" })(
        ({ tempDir, filePath }) => {
          const njkPath = path.join(tempDir, "page.njk");
          fs.renameSync(filePath, njkPath);
          gitCommit(tempDir, "convert to njk", "2025-02-01T10:00:00Z");
          const liquidPath = path.join(tempDir, "page.liquid");
          fs.renameSync(njkPath, liquidPath);
          gitCommit(tempDir, "convert to liquid", "2025-03-01T10:00:00Z");
          fs.renameSync(liquidPath, path.join(tempDir, "page2.liquid"));
          gitCommit(tempDir, "rename liquid", "2025-04-01T10:00:00Z");

          const lookup = createLookup(tempDir);
          expect(lookup.datesFor("page.liquid")).toEqual({
            published: "2025-01-01T10:00:00Z",
            updated: "2025-04-01T10:00:00Z",
          });
          expect(lookup.datesFor("page2.liquid")).toEqual({
            published: "2025-01-01T10:00:00Z",
            updated: "2025-04-01T10:00:00Z",
          });
        },
      ));

    test("terminates when rename propagation reaches a cycle", () =>
      withGitRepo("git-dates-rename-cycle", { fileName: "page.txt" })(
        ({ tempDir, filePath }) => {
          fs.renameSync(filePath, path.join(tempDir, "a.md"));
          gitCommit(tempDir, "to a.md", "2025-02-01T10:00:00Z");
          fs.renameSync(path.join(tempDir, "a.md"), path.join(tempDir, "b.md"));
          gitCommit(tempDir, "to b.md", "2025-02-01T10:00:00Z");
          fs.renameSync(path.join(tempDir, "b.md"), path.join(tempDir, "a.md"));
          gitCommit(tempDir, "back to a.md", "2025-02-01T10:00:00Z");

          const lookup = createLookup(tempDir);
          expect(lookup.datesFor("a.md")).toEqual({
            published: "2025-01-01T10:00:00Z",
            updated: "2025-02-01T10:00:00Z",
          });
          expect(lookup.datesFor("b.md")).toEqual({
            published: "2025-01-01T10:00:00Z",
            updated: "2025-02-01T10:00:00Z",
          });
        },
      ));

    test("propagates the backfilled origin through copies of the renamed template", () =>
      withGitRepo("git-dates-rename-copy", { fileName: "page.txt" })(
        ({ tempDir, filePath }) => {
          fs.renameSync(filePath, path.join(tempDir, "page.md"));
          gitCommit(tempDir, "convert to md", "2025-02-01T10:00:00Z");
          fs.copyFileSync(
            path.join(tempDir, "page.md"),
            path.join(tempDir, "copy.md"),
          );
          gitCommit(tempDir, "copy page", "2025-03-01T10:00:00Z");

          const lookup = createLookup(tempDir);
          expect(lookup.datesFor("page.md")).toEqual({
            published: "2025-01-01T10:00:00Z",
            updated: "2025-02-01T10:00:00Z",
          });
          expect(lookup.datesFor("copy.md")).toEqual({
            published: "2025-01-01T10:00:00Z",
            updated: "2025-03-01T10:00:00Z",
          });
        },
      ));

    test("falls back to the copy date when a template is copied from a non-template path", () =>
      withGitRepo("git-dates-cross-extension-copy", {
        fileName: "base.njk",
      })(({ tempDir, filePath }) => {
        // Copy detection is restricted to template paths for cost, so a
        // source outside the pathspec cannot be traced. The copy date is
        // still correct as the last-updated date.
        fs.copyFileSync(filePath, path.join(tempDir, "base.liquid"));
        gitCommit(tempDir, "copy base to liquid", "2025-02-01T10:00:00Z");

        expect(createLookup(tempDir).datesFor("base.liquid")).toEqual({
          published: "2025-02-01T10:00:00Z",
          updated: "2025-02-01T10:00:00Z",
        });
      }));

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

    test("propagates the original publish date through a copy followed by a rename", () =>
      withGitRepo("git-dates-copy-rename-chain", { fileName: "base.md" })(
        ({ tempDir, filePath }) => {
          fs.copyFileSync(filePath, path.join(tempDir, "dup.md"));
          gitCommit(tempDir, "copy page", "2025-02-01T10:00:00Z");
          fs.renameSync(
            path.join(tempDir, "dup.md"),
            path.join(tempDir, "dup2.md"),
          );
          gitCommit(tempDir, "rename copy", "2025-03-01T10:00:00Z");

          const lookup = createLookup(tempDir);
          expect(lookup.datesFor("dup.md")).toEqual({
            published: "2025-01-01T10:00:00Z",
            updated: "2025-03-01T10:00:00Z",
          });
          expect(lookup.datesFor("dup2.md")).toEqual({
            published: "2025-01-01T10:00:00Z",
            updated: "2025-03-01T10:00:00Z",
          });
        },
      ));

    test("fails fast when the git history command fails", () =>
      withGitRepo("git-dates-failing-history", { fileName: "page.md" })(
        ({ tempDir }) => {
          fs.writeFileSync(
            path.join(tempDir, ".git", "HEAD"),
            "ref: refs/heads/nope",
          );
          expect(() => createLookup(tempDir)).toThrow();
        },
      ));

    test("bumps the updated date for a mode-only change", () =>
      withGitRepo("git-dates-mode-only", { fileName: "script.md" })(
        ({ tempDir, filePath }) => {
          fs.chmodSync(filePath, 0o755);
          gitCommit(tempDir, "make executable", "2025-02-01T10:00:00Z");

          expect(createLookup(tempDir).datesFor("script.md")).toEqual({
            published: "2025-01-01T10:00:00Z",
            updated: "2025-02-01T10:00:00Z",
          });
        },
      ));

    /**
     * Build main and feature edits over the base commit, merge them into a
     * conflict, and complete the merge by writing the given resolution.
     */
    const mergeWithResolution = (
      tempDir,
      filePath,
      {
        resolved,
        mergeAuthorDate,
        mergeCommitterDate = mergeAuthorDate,
        mainEditDate = "2025-02-01T10:00:00Z",
      },
    ) => {
      fs.writeFileSync(filePath, "main version");
      gitCommit(tempDir, "edit on main", mainEditDate);
      runGitInDir(["checkout", "-b", "feature", "HEAD~1"], tempDir);
      fs.writeFileSync(filePath, "feature version");
      gitCommit(tempDir, "edit on feature", "2025-03-01T10:00:00Z");
      runGitInDir(["checkout", "main"], tempDir);
      const merge = spawnSync("git", ["merge", "--no-edit", "feature"], {
        cwd: tempDir,
        stdio: "ignore",
      });
      expect(merge.status).not.toBe(0);
      fs.writeFileSync(filePath, resolved);
      runGitInDir(["add", "-A"], tempDir);
      execFileSync("git", ["commit", "-m", "merge feature"], {
        cwd: tempDir,
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: mergeAuthorDate,
          GIT_COMMITTER_DATE: mergeCommitterDate,
        },
      });
    };

    function mergeNovelResolution(tempDir, filePath) {
      return mergeWithResolution(tempDir, filePath, {
        resolved: "merged version",
        mergeAuthorDate: "2025-04-01T10:00:00Z",
      });
    }

    const lookupMergedPage = (tempDir) => ({
      gitUpdated: runGitInDir(
        ["log", "-1", "--format=%aI", "--", "page.md"],
        tempDir,
      ),
      dates: createLookup(tempDir).datesFor("page.md"),
    });

    test("keeps the simplified-history date across a conflict resolved for one parent", () =>
      withGitRepo("git-dates-merge-resolution", { fileName: "page.md" })(
        ({ tempDir, filePath }) => {
          mergeWithResolution(tempDir, filePath, {
            resolved: "main version",
            mergeAuthorDate: "2025-04-01T10:00:00Z",
          });

          const { gitUpdated, dates } = lookupMergedPage(tempDir);
          expect(dates.updated).toBe("2025-02-01T10:00:00Z");
          expect(dates.updated).toBe(gitUpdated);
        },
      ));

    test("counts a merge that resolves to novel content as the update", () =>
      withGitRepo("git-dates-merge-novel-resolution", { fileName: "page.md" })(
        ({ tempDir, filePath }) => {
          mergeNovelResolution(tempDir, filePath);

          const { gitUpdated, dates } = lookupMergedPage(tempDir);
          expect(dates.updated).toBe("2025-04-01T10:00:00Z");
          expect(dates.updated).toBe(gitUpdated);
          expect(dates.published).toBe("2025-01-01T10:00:00Z");
        },
      ));

    test("keeps a post-merge edit newer than the merge resolution", () =>
      withGitRepo("git-dates-post-merge-edit", { fileName: "page.md" })(
        ({ tempDir, filePath }) => {
          mergeNovelResolution(tempDir, filePath);
          fs.writeFileSync(filePath, "polished version");
          gitCommit(tempDir, "polish after merge", "2025-05-01T10:00:00Z");

          const { gitUpdated, dates } = lookupMergedPage(tempDir);
          expect(dates.updated).toBe("2025-05-01T10:00:00Z");
          expect(dates.updated).toBe(gitUpdated);
        },
      ));

    test("counts a merge as the update even when authored before a parent edit", () =>
      withGitRepo("git-dates-merge-topology", { fileName: "page.md" })(
        ({ tempDir, filePath }) => {
          mergeWithResolution(tempDir, filePath, {
            resolved: "merged version",
            mergeAuthorDate: "2025-02-01T10:00:00Z",
            mergeCommitterDate: "2025-05-01T10:00:00Z",
            mainEditDate: "2025-04-01T10:00:00Z",
          });

          const updated = runGitInDir(
            ["log", "-1", "--format=%aI", "--", "page.md"],
            tempDir,
          );
          const dates = createLookup(tempDir).datesFor("page.md");
          expect(dates.updated).toBe("2025-02-01T10:00:00Z");
          expect(dates.updated).toBe(updated);
        },
      ));

    test("replaces the published date when a rename reuses a deleted path", () =>
      withGitRepo("git-dates-reused-path", { fileName: "page.md" })(
        ({ tempDir }) => {
          fs.rmSync(path.join(tempDir, "page.md"));
          gitCommit(tempDir, "delete page", "2025-02-01T10:00:00Z");
          fs.writeFileSync(path.join(tempDir, "page.txt"), "fresh content");
          gitCommit(tempDir, "add page.txt", "2025-03-01T10:00:00Z");
          fs.renameSync(
            path.join(tempDir, "page.txt"),
            path.join(tempDir, "page.md"),
          );
          gitCommit(tempDir, "rename to page.md", "2025-04-01T10:00:00Z");

          expect(createLookup(tempDir).datesFor("page.md")).toEqual({
            published: "2025-03-01T10:00:00Z",
            updated: "2025-04-01T10:00:00Z",
          });
        },
      ));

    test("anchors a rename origin to the transfer commit", () =>
      withGitRepo("git-dates-source-reuse", { fileName: "page.txt" })(
        ({ tempDir, filePath }) => {
          fs.renameSync(filePath, path.join(tempDir, "old.md"));
          gitCommit(tempDir, "convert to md", "2025-02-01T10:00:00Z");
          fs.writeFileSync(path.join(tempDir, "source.md"), "new source");
          gitCommit(tempDir, "add source", "2025-03-01T10:00:00Z");
          fs.copyFileSync(
            path.join(tempDir, "source.md"),
            path.join(tempDir, "page.txt"),
          );
          gitCommit(tempDir, "reuse page.txt", "2025-04-01T10:00:00Z");

          expect(createLookup(tempDir).datesFor("old.md")).toEqual({
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
