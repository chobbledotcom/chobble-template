import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildReverseIndex } from "#toolkit/fp/grouping.js";

const HISTORY_TIMEOUT_MS = 120_000;
const HISTORY_MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const TEMPLATE_PATHS = ["*.html", "*.liquid", "*.md"];
const HISTORY_SCAN_ARGS = [
  "--reverse",
  "--format=%x1e%aI",
  "--raw",
  "--no-abbrev",
  "--find-renames",
  "-z",
];

/** @typedef {import("node:child_process").SpawnSyncReturns<string>} GitResult */
/** @typedef {{ published: string, updated: string, blob: string }} IndexedGitDates */
/** @typedef {{ published: string, updated: string }} GitDates */
/** @typedef {{ blob: string, status: string }} RawChange */
/** @typedef {{ oldPath: string, newPath: string, date: string, status: string }} TransferRecord */
/** @typedef {{ change: RawChange | null, firstPath: string | null, remaining: number }} ParseState */
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
 * @property {(dates: IndexedGitDates, date: string, blob: string) => void} updateDates
 * @property {(index: GitDateIndex, status: string, path: string, date: string, blob: string) => void} applyPathChange
 * @property {(index: GitDateIndex, oldPath: string, newPath: string, date: string, blob: string, status: string) => void} applyTransfer
 * @property {(index: GitDateIndex, change: RawChange, paths: string[], date: string) => void} applyHistoryChange
 * @property {(rawChange: string | undefined) => RawChange | null} parseRawChange
 * @property {(change: RawChange) => number} pathsConsumedBy
 * @property {(record: string) => { date: string, tokens: string[] }} splitHistoryRecord
 * @property {(record: string) => TransferRecord[]} recordTransfers
 * @property {() => ParseState} initialState
 * @property {(state: ParseState, token: string) => ParseState} startChange
 * @property {(state: ParseState, token: string, index: GitDateIndex, date: string) => ParseState} consumePath
 * @property {(state: ParseState, token: string, index: GitDateIndex, date: string) => ParseState} parseHistoryToken
 * @property {(record: string, index: GitDateIndex) => void} parseHistoryRecord
 * @property {(repo: string, args: string[]) => { dates: GitDateIndex, renames: TransferRecord[] }} scanHistory
 * @property {(repo: string) => { dates: GitDateIndex, renames: TransferRecord[] }} buildRepoIndex
 * @property {(repo: string) => TransferRecord[]} copyRecords
 * @property {(index: GitDateIndex, renames: TransferRecord[], copies: TransferRecord[]) => void} applyCopyOrigins
 * @property {(index: GitDateIndex, renamesBySource: Map<string, TransferRecord[]>, path: string, origin: string, copyDate: string) => void} patchCopiedChain
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

  updateDates(dates, date, blob) {
    if (dates.blob !== blob) dates.updated = date;
    dates.blob = blob;
  },

  applyPathChange(index, status, path, date, blob) {
    if (status === "D") {
      const dates = history.datesAt(index, path, date, blob);
      history.updateDates(dates, date, blob);
      index.set(path, dates);
      return;
    }
    const dates = index.get(path);
    if (!dates) {
      index.set(path, history.initialDates(date, blob));
      return;
    }
    history.updateDates(dates, date, blob);
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
      .match(/^:\d+ \d+ [0-9a-f]+ ([0-9a-f]+) ([A-Z])(\d+)?$/);
    return match ? { blob: match[1], status: match[2] } : null;
  },

  pathsConsumedBy({ status }) {
    return status === "R" || status === "C" ? 2 : 1;
  },

  applyHistoryChange(index, { blob, status }, paths, date) {
    if (status === "R" || status === "C") {
      history.applyTransfer(index, paths[0], paths[1], date, blob, status);
      return;
    }
    const path = paths[0];
    if (path) history.applyPathChange(index, status, path, date, blob);
  },

  splitHistoryRecord(record) {
    const [rawDate, ...tokens] = record.split("\0");
    return { date: rawDate.trim(), tokens };
  },

  recordTransfers(record) {
    const { date, tokens } = history.splitHistoryRecord(record);
    if (tokens.length === 0) return [];
    return tokens.flatMap((token, position) => {
      const change = history.parseRawChange(token);
      if (!change || history.pathsConsumedBy(change) === 1) return [];
      const [oldPath, newPath] = tokens.slice(
        position + 1,
        position + 1 + history.pathsConsumedBy(change),
      );
      if (!oldPath || !newPath) return [];
      return [{ oldPath, newPath, date, status: change.status }];
    });
  },

  initialState() {
    return { change: null, firstPath: null, remaining: 0 };
  },

  startChange(state, token) {
    const change = history.parseRawChange(token);
    return change
      ? {
          change,
          firstPath: null,
          remaining: history.pathsConsumedBy(change),
        }
      : state;
  },

  consumePath(state, token, index, date) {
    if (state.remaining === 1 && state.change) {
      const paths = state.firstPath ? [state.firstPath, token] : [token];
      history.applyHistoryChange(index, state.change, paths, date);
      return { change: null, firstPath: null, remaining: 0 };
    }
    return {
      change: state.change,
      firstPath: token,
      remaining: state.remaining - 1,
    };
  },

  parseHistoryToken(state, token, index, date) {
    return state.remaining === 0
      ? history.startChange(state, token)
      : history.consumePath(state, token, index, date);
  },

  parseHistoryRecord(record, index) {
    const { date, tokens } = history.splitHistoryRecord(record);
    if (!date) return;
    tokens.reduce(
      (state, token) => history.parseHistoryToken(state, token, index, date),
      history.initialState(),
    );
  },

  scanHistory(repo, args) {
    const output = history.gitOutput(repo, [
      "log",
      ...HISTORY_SCAN_ARGS,
      ...args,
    ]);
    const records = output ? output.split("\x1e") : [];
    const dates = records.reduce((index, record) => {
      history.parseHistoryRecord(record, index);
      return index;
    }, new Map());
    const renames = records.flatMap((record) =>
      history.recordTransfers(record),
    );
    return { dates, renames };
  },

  buildRepoIndex(repo) {
    // Full history with rename detection: cheap without copy detection, and
    // it indexes every path, so a rename's source always carries true dates.
    return history.scanHistory(repo, []);
  },

  copyRecords(repo) {
    const { renames } = history.scanHistory(repo, [
      "--find-copies-harder",
      "--diff-filter=C",
      "--",
      ...TEMPLATE_PATHS,
    ]);
    return renames;
  },

  applyCopyOrigins(index, renames, copies) {
    const renamesBySource = buildReverseIndex(renames, (rename) => [
      rename.oldPath,
    ]);
    for (const { oldPath, newPath, date } of copies) {
      const source = index.get(oldPath);
      if (!source) continue;
      history.patchCopiedChain(
        index,
        renamesBySource,
        newPath,
        source.published,
        date,
      );
    }
  },

  patchCopiedChain(index, renamesBySource, path, origin, copyDate) {
    const dates = index.get(path);
    if (!dates || dates.published !== copyDate) return;
    dates.published = origin;
    const descendants = renamesBySource.get(path);
    if (!descendants) return;
    for (const { newPath } of descendants) {
      history.patchCopiedChain(
        index,
        renamesBySource,
        newPath,
        origin,
        copyDate,
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
    const { dates, renames } = history.buildRepoIndex(repo);
    history.applyCopyOrigins(dates, renames, history.copyRecords(repo));
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
