/**
 * After a successful precommit run, when the working tree is clean and there
 * are unpushed commits, offer to `git push`. This is a no-op inside the git
 * pre-commit hook itself (the tree is dirty there because changes are staged),
 * and only fires when precommit is run manually (e.g. via the `pc` alias)
 * after a commit has been made.
 */
import { spawnSync } from "node:child_process";
import readline from "node:readline";

const REMOTE_REFS = ["origin/main", "origin/master", "origin/trunk"];

const revListCount = (range) => {
  const r = spawnSync("git", ["rev-list", "--count", range], {
    encoding: "utf8",
  });
  if (r.status !== 0) return undefined;
  const n = Number((r.stdout ?? "").trim());
  return Number.isFinite(n) ? n : undefined;
};

const getGitOutput = (args) => {
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.status !== 0) return undefined;
  const v = (r.stdout ?? "").trim();
  return v || undefined;
};

export const getPushPromptContext = () => {
  if (
    spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
      encoding: "utf8",
    }).status !== 0
  ) {
    return undefined;
  }

  const status = spawnSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  });
  if (status.status !== 0 || (status.stdout ?? "").trim()) return undefined;

  const commitMessage = getGitOutput(["log", "-1", "--format=%B"]);
  if (!commitMessage) return undefined;

  const upstreamR = spawnSync(
    "git",
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
    { encoding: "utf8" },
  );
  const unpushedCommits =
    upstreamR.status === 0 && (upstreamR.stdout ?? "").trim()
      ? revListCount(`${(upstreamR.stdout ?? "").trim()}..HEAD`)
      : revListCount(
          `${REMOTE_REFS.find(
            (ref) =>
              spawnSync("git", ["rev-parse", "--verify", ref], {
                encoding: "utf8",
              }).status === 0,
          )}..HEAD`,
        );
  if (!unpushedCommits || unpushedCommits < 1) return undefined;

  const originUrl = getGitOutput(["remote", "get-url", "origin"]);
  const branchName = getGitOutput(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!originUrl || !branchName || branchName === "HEAD") return undefined;

  return { branchName, commitMessage, originUrl, unpushedCommits };
};

export const formatPushPrompt = (ctx) => {
  const subject = ctx.commitMessage.split(/\r?\n/)[0]?.trim() ?? "";
  const label = ctx.unpushedCommits === 1 ? "commit" : "commits";
  const tail = subject ? ` (${subject}) ` : " ";
  return `Push ${ctx.unpushedCommits} ${label} from ${ctx.branchName} to ${ctx.originUrl}?${tail}[y/N] `;
};

export const promptToPushCheckedInChanges = ({ isInteractive }) => {
  if (!isInteractive()) return Promise.resolve(true);

  const ctx = getPushPromptContext();
  if (!ctx) return Promise.resolve(true);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(formatPushPrompt(ctx), (answer) => {
      rl.close();
      if (!/^(y|yes)$/i.test(answer.trim())) return resolve(true);
      const result = spawnSync("git", ["push"], { stdio: "inherit" });
      resolve(result.status === 0);
    });
  });
};
