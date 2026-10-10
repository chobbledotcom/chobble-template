import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildReverseIndex } from "#toolkit/fp/grouping.js";

const HISTORY_TIMEOUT_MS = 120_000;
const HISTORY_MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const TEMPLATE_PATHS = ["*.html", "*.liquid", "*.md"];
const HISTORY_SCAN_ARGS = [
  "--reverse",
  "--format=%x1e%aI%x00%H",
  "--raw",
  "--no-abbrev",
  "--find-renames",
  "-z",
];

/** @typedef {import("node:child_process").SpawnSyncReturns<string>} GitResult */
/** @typedef {{ published: string, updated: string, blob: string }} IndexedGitDates */
/** @typedef {{ published: string, updated: string }} GitDates */
/** @typedef {{ oldMode: string, newMode: string, blob: string, status: string }} RawChange */
/** @typedef {{ commit: string, oldPath: string, newPath: string, date: string, status: string }} TransferRecord */
/** @typedef {Map<string, IndexedGitDates>} GitDateIndex */
/** @typedef {{ repo: string, dates: GitDateIndex }} GitRepoIndex */
/** @typedef {{ durationMs: number, paths: number, repositories: number }} GitDateStats */
/** @typedef {{ datesFor: (inputPath: string | null | undefined) => GitDates | null, updatedFor: (inputPath: string | null | undefined) => string | null, stats: GitDateStats }} GitDateLookup */
/** @typedef {{ cwd?: string, configuredRepo?: string | null }} GitDateLookupOptions */
/**
 * @typedef {object} GitHistory
 * @property {(repo: string, args: string[], allowFailure?: boolean) => string | undefined} gitOutput
 * @property {(result: GitResult) => void} assertGitSuccess
 * @property {(inputPath: string) => string[]} pathCandidates
 * @property {(cwd: string, configuredRepo: string | null | undefined) => string[]} candidateRepos
 * @property {(date: string, blob: string) => IndexedGitDates} initialDates
 * @property {(index: GitDateIndex, path: string, date: string, blob: string) => IndexedGitDates} datesAt
 * @property {(dates: IndexedGitDates, date: string, blob: string, modeChanged?: boolean) => void} updateDates
 * @property {(index: GitDateIndex, status: string, path: string, date: string, blob: string, modeChanged: boolean) => void} applyPathChange
 * @property {(index: GitDateIndex, oldPath: string, newPath: string, date: string, blob: string, status: string) => void} applyTransfer
 * @property {(index: GitDateIndex, change: RawChange, paths: string[], date: string) => void} applyHistoryChange
 * @property {(rawChange: string | undefined) => RawChange | null} parseRawChange
 * @property {(change: RawChange) => number} pathsConsumedBy
 * @property {(record: string) => { date: string, hash: string, tokens: string[] }} splitHistoryRecord
 * @property {(record: string) => { date: string, hash: string, tokens: string[] } | undefined} parseDatedRecord
 * @property {(record: { tokens: string[] }) => { change: RawChange, paths: string[] }[]} recordChanges
 * @property {(record: { date: string, hash: string, tokens: string[] }) => TransferRecord[]} recordTransfers
 * @property {(index: GitDateIndex, record: string, mergeRecords: Map<string, { record: string, novelPaths: Set<string> }>) => void} applyRecord
 * @property {(index: GitDateIndex, changes: { change: RawChange, paths: string[] }[], date: string) => void} applyChanges
 * @property {(index: GitDateIndex, parsed: { date: string, hash: string, tokens: string[] }, mergeRecords: Map<string, { record: string, novelPaths: Set<string> }>) => void} replayMergeResolution
 * @property {(repo: string, args: string[]) => string[]} historyRecords
 * @property {(repo: string) => Map<string, { record: string, novelPaths: Set<string> }>} mergeResolutionRecords
 * @property {(repo: string) => Map<string, Set<string>>} mergeNovelPaths
 * @property {(parsed: { tokens: string[] }) => Set<string>} novelPaths
 * @property {(resolution: { record: string, novelPaths: Set<string> }) => { change: RawChange, paths: string[] }[]} resolutionChanges
 * @property {(byHash: Map<string, { record: string, novelPaths: Set<string> }>, hash: string) => { record: string, novelPaths: Set<string> } | undefined} takeMergeRecord
 * @property {(repo: string) => { dates: GitDateIndex, transfers: TransferRecord[] }} buildRepoIndex
 * @property {(repo: string) => TransferRecord[]} renameRecords
 * @property {(repo: string, sourcePath: string, anchor: string) => string | undefined} originDateFor
 * @property {(repo: string, index: GitDateIndex, renames: TransferRecord[], transfers: TransferRecord[]) => void} applyRenameOrigins
 * @property {(dates: { published: string, updated: string }, transferDate: string) => boolean} lineageMatches
 * @property {(index: GitDateIndex, successorsBySource: Map<string, TransferRecord[]>, path: string, origin: string, transferDate: string, visited?: Set<string>) => void} patchOriginChain
 * @property {(indexes: GitRepoIndex[], inputPath: string) => IndexedGitDates | undefined} findDates
 * @property {(indexes: GitRepoIndex[], inputPath: string | null | undefined) => GitDates | null} datesFor
 * @property {(indexes: GitRepoIndex[], startedAt: number) => GitDateLookup} createLookup
 */

/** @type {GitHistory} */
const history = Object.freeze({
  gitOutput(repo, args, allowFailure = false) {
    const result = spawnSync("git", ["-C", repo, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: HISTORY_TIMEOUT_MS,
      maxBuffer: HISTORY_MAX_BUFFER_BYTES,
    });
    const failed = Boolean(result.error || result.status !== 0);
    if (allowFailure && failed) return undefined;
    history.assertGitSuccess(result);
    const output = result.stdout.trim();
    return output === "" ? undefined : output;
  },

  assertGitSuccess(result) {
    if (result.error) throw result.error;
    if (result.status !== 0) {
      const stderr = result.stderr.trim();
      throw new Error(stderr === "" ? `git exited ${result.status}` : stderr);
    }
  },

  pathCandidates(inputPath) {
    const relative = inputPath.replace(/^\.\//, "");
    return relative.startsWith("src/")
      ? [relative, relative.slice(4)]
      : [relative];
  },

  candidateRepos(cwd, configuredRepo) {
    const candidates = [configuredRepo, cwd, resolve(dirname(cwd), "source")]
      .filter((repo) => typeof repo === "string")
      .map((repo) => resolve(repo))
      .filter((repo) => existsSync(repo) && existsSync(resolve(repo, ".git")));
    const roots = candidates
      .map((repo) =>
        history.gitOutput(repo, ["rev-parse", "--show-toplevel"], true),
      )
      .filter((root) => typeof root === "string");
    return [...new Set(roots)];
  },

  initialDates(date, blob) {
    return { published: date, updated: date, blob };
  },

  datesAt(index, path, date, blob) {
    const existing = index.get(path);
    return existing ? existing : history.initialDates(date, blob);
  },

  updateDates(dates, date, blob, modeChanged) {
    if (dates.blob !== blob || modeChanged) dates.updated = date;
    dates.blob = blob;
  },

  applyPathChange(index, status, path, date, blob, modeChanged) {
    if (status === "D") {
      const dates = history.datesAt(index, path, date, blob);
      history.updateDates(dates, date, blob, modeChanged);
      index.set(path, dates);
      return;
    }
    const dates = index.get(path);
    if (!dates) {
      index.set(path, history.initialDates(date, blob));
      return;
    }
    history.updateDates(dates, date, blob, modeChanged);
  },

  applyTransfer(index, oldPath, newPath, date, blob, status) {
    const dates = history.datesAt(index, oldPath, date, blob);
    if (status === "R") {
      history.updateDates(dates, date, "0");
      index.set(oldPath, dates);
    }
    index.set(newPath, { ...dates, updated: date, blob });
  },

  parseRawChange(rawChange) {
    const match = rawChange
      ?.trim()
      .match(/^:(\d+) (\d+) [0-9a-f]+ ([0-9a-f]+) ([A-Z])(\d+)?$/);
    return match
      ? {
          oldMode: match[1],
          newMode: match[2],
          blob: match[3],
          status: match[4],
        }
      : null;
  },

  pathsConsumedBy({ status }) {
    return status === "R" || status === "C" ? 2 : 1;
  },

  applyHistoryChange(index, { blob, status, oldMode, newMode }, paths, date) {
    if (status === "R" || status === "C") {
      history.applyTransfer(index, paths[0], paths[1], date, blob, status);
      return;
    }
    const path = paths[0];
    if (path) {
      history.applyPathChange(
        index,
        status,
        path,
        date,
        blob,
        oldMode !== newMode,
      );
    }
  },

  splitHistoryRecord(record) {
    const [rawDate, hash, ...tokens] = record.split("\0");
    return { date: rawDate.trim(), hash, tokens };
  },

  parseDatedRecord(record) {
    const parsed = history.splitHistoryRecord(record);
    return parsed.date ? parsed : undefined;
  },

  recordChanges({ tokens }) {
    return tokens.flatMap((token, position) => {
      const change = history.parseRawChange(token);
      if (!change) return [];
      const paths = tokens.slice(
        position + 1,
        position + 1 + history.pathsConsumedBy(change),
      );
      if (paths.length < history.pathsConsumedBy(change)) return [];
      return [{ change, paths }];
    });
  },

  recordTransfers(parsed) {
    return history
      .recordChanges(parsed)
      .filter(({ change }) => history.pathsConsumedBy(change) === 2)
      .map(({ change, paths }) => ({
        commit: parsed.hash,
        oldPath: paths[0],
        newPath: paths[1],
        date: parsed.date,
        status: change.status,
      }));
  },

  applyRecord(index, record, mergeRecords) {
    const parsed = history.parseDatedRecord(record);
    if (!parsed) return;
    const changes = history.recordChanges(parsed);
    if (changes.length === 0) {
      history.replayMergeResolution(index, parsed, mergeRecords);
      return;
    }
    history.applyChanges(index, changes, parsed.date);
  },

  applyChanges(index, changes, date) {
    for (const { change, paths } of changes) {
      history.applyHistoryChange(index, change, paths, date);
    }
  },

  replayMergeResolution(index, parsed, mergeRecords) {
    // A date-only record is an interesting merge; replay its first-parent diff at this position.
    const resolution = history.takeMergeRecord(mergeRecords, parsed.hash);
    if (!resolution) return;
    history.applyChanges(
      index,
      history.resolutionChanges(resolution),
      parsed.date,
    );
  },

  resolutionChanges({ record, novelPaths }) {
    const parsed = history.splitHistoryRecord(record);
    return history
      .recordChanges(parsed)
      .filter(
        ({ change, paths }) =>
          change.oldMode !== "000000" ||
          novelPaths.has(paths[paths.length - 1]),
      );
  },

  historyRecords(repo, args) {
    const output = history.gitOutput(repo, [
      "log",
      ...HISTORY_SCAN_ARGS,
      ...args,
    ]);
    return output ? output.split("\x1e") : [];
  },

  mergeResolutionRecords(repo) {
    const novels = history.mergeNovelPaths(repo);
    return indexByCommit(
      history.historyRecords(repo, [
        "--merges",
        "--diff-merges=first-parent",
        "--",
        ...TEMPLATE_PATHS,
      ]),
      (parsed, record) => {
        if (history.recordChanges(parsed).length === 0) return undefined;
        const novelPaths = novels.get(parsed.hash) || new Set();
        return { record, novelPaths };
      },
    );
  },

  mergeNovelPaths(repo) {
    // Combined diffs list paths whose merge result differs from every parent.
    return indexByCommit(
      history.historyRecords(repo, [
        "--merges",
        "--diff-merges=combined",
        "--",
        ...TEMPLATE_PATHS,
      ]),
      (parsed) => {
        const novelPaths = history.novelPaths(parsed);
        return novelPaths.size > 0 ? novelPaths : undefined;
      },
    );
  },

  novelPaths({ tokens }) {
    return new Set(
      tokens.flatMap((token, position) => {
        if (!token?.trim().match(/^:{2,}(?:\d{6} )+(?:[0-9a-f]+ )+[A-Z]+$/)) {
          return [];
        }
        return [tokens[position + 1]];
      }),
    );
  },

  takeMergeRecord(byHash, hash) {
    const record = byHash.get(hash);
    if (record) byHash.delete(hash);
    return record;
  },

  buildRepoIndex(repo) {
    // The template pathspec keeps git's history simplification, matching the legacy per-path queries.
    const mergeRecords = history.mergeResolutionRecords(repo);
    const records = history.historyRecords(repo, [
      "--find-copies-harder",
      "--",
      ...TEMPLATE_PATHS,
    ]);
    const dates = records.reduce((index, record) => {
      history.applyRecord(index, record, mergeRecords);
      return index;
    }, new Map());
    const transfers = records.flatMap(transferFromRecord);
    return { dates, transfers };
  },

  renameRecords(repo) {
    const records = history.historyRecords(repo, ["--diff-filter=RC"]);
    return records.flatMap(transferFromRecord);
  },

  originDateFor(repo, sourcePath, anchor) {
    const output = history.gitOutput(repo, [
      "log",
      anchor,
      "--follow",
      "--diff-filter=A",
      "--format=%aI",
      "--",
      sourcePath,
    ]);
    return output?.split("\n").filter(Boolean).pop();
  },

  applyRenameOrigins(repo, index, renames, transfers) {
    // Propagation edges: renames plus the scan's copies, so backfilled origins reach copies.
    const successorsBySource = buildReverseIndex(
      [...renames, ...transfers.filter(({ status }) => status === "C")],
      (edge) => [edge.oldPath],
    );
    for (const { commit, oldPath, newPath, date } of renames) {
      if (index.has(oldPath) || !index.has(newPath)) continue;
      const origin = history.originDateFor(repo, oldPath, commit);
      if (!origin) continue;
      history.patchOriginChain(
        index,
        successorsBySource,
        newPath,
        origin,
        date,
      );
    }
  },

  lineageMatches(dates, transferDate) {
    return dates.published === transferDate || dates.updated === transferDate;
  },

  patchOriginChain(
    index,
    successorsBySource,
    path,
    origin,
    transferDate,
    visited = new Set(),
  ) {
    if (visited.has(path)) return;
    visited.add(path);
    const dates = index.get(path);
    if (!dates) return;
    // A rename into a deleted-and-reused path must replace the stale published date.
    if (!history.lineageMatches(dates, transferDate)) return;
    dates.published = origin;
    const successors = successorsBySource.get(path);
    if (!successors) return;
    for (const { newPath } of successors) {
      history.patchOriginChain(
        index,
        successorsBySource,
        newPath,
        origin,
        transferDate,
        visited,
      );
    }
  },

  findDates(indexes, inputPath) {
    return indexes
      .flatMap(({ dates }) =>
        history
          .pathCandidates(inputPath)
          .map((candidate) => dates.get(candidate)),
      )
      .find(Boolean);
  },

  datesFor(indexes, inputPath) {
    if (!inputPath) return null;
    const result = history.findDates(indexes, inputPath);
    return result
      ? { published: result.published, updated: result.updated }
      : null;
  },

  createLookup(indexes, startedAt) {
    return {
      datesFor: (inputPath) => history.datesFor(indexes, inputPath),
      updatedFor: (inputPath) => {
        const dates = history.datesFor(indexes, inputPath);
        return dates ? dates.updated : null;
      },
      stats: {
        durationMs: performance.now() - startedAt,
        paths: indexes.reduce((total, { dates }) => total + dates.size, 0),
        repositories: indexes.length,
      },
    };
  },
});

/** @param {string} record @returns {TransferRecord[]} */
function transferFromRecord(record) {
  return history.recordTransfers(history.splitHistoryRecord(record));
}

/**
 * @template T
 * @param {string[]} records
 * @param {(parsed: { date: string, hash: string, tokens: string[] }, record: string) => T | undefined} extract
 * @returns {Map<string, T>}
 */
function indexByCommit(records, extract) {
  return records.reduce((byHash, record) => {
    const parsed = history.parseDatedRecord(record);
    if (!parsed) return byHash;
    const value = extract(parsed, record);
    if (!value) return byHash;
    byHash.set(parsed.hash, value);
    return byHash;
  }, new Map());
}

/**
 * @param {GitDateLookupOptions} [options]
 * @returns {GitDateLookup}
 */
export const createGitDateLookup = (options = {}) => {
  const startedAt = performance.now();
  const cwd = options.cwd === undefined ? process.cwd() : options.cwd;
  const configuredRepo =
    options.configuredRepo === undefined
      ? process.env.GIT_DATES_REPO
      : options.configuredRepo;
  const indexes = history.candidateRepos(cwd, configuredRepo).map((repo) => {
    const { dates, transfers } = history.buildRepoIndex(repo);
    history.applyRenameOrigins(
      repo,
      dates,
      history.renameRecords(repo),
      transfers,
    );
    return { repo, dates };
  });
  return history.createLookup(indexes, startedAt);
};

/** @param {string | null | undefined} iso */
export const formatHuman = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/** @param {string | null | undefined} iso */
export const formatIso = (iso) => {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
};
