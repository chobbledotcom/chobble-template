import { spawnSync } from "node:child_process";
import { ROOT_DIR } from "#lib/paths.js";

/**
 * Spawn a CLI tool from the repository root and prove it actually ran:
 * throws when the process could not be spawned or died to a signal, so a
 * missing binary or a crashed tool can never masquerade as a clean run.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {import("node:child_process").SpawnSyncOptions} options
 * @returns {{ status: number, stdout: string | Buffer | null, stderr: string | Buffer | null }}
 */
const spawnChecked = (command, args, options) => {
  const result = spawnSync(command, args, { cwd: ROOT_DIR, ...options });
  if (result.error) {
    throw new Error(`Failed to run ${command}: ${result.error.message}`);
  }
  if (result.status === null) {
    throw new Error(`${command} was terminated by signal ${result.signal}`);
  }
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

/**
 * Run a CLI tool with inherited stdio; callers only ever see a real
 * exit code.
 * @param {string} command
 * @param {string[]} args
 * @returns {number} The tool's exit code
 */
export const runTool = (command, args) =>
  spawnChecked(command, args, { stdio: "inherit" }).status;

/**
 * Run a CLI tool capturing its combined stdout/stderr instead of
 * streaming it. Same fail-fast rules as runTool.
 * @param {string} command
 * @param {string[]} args
 * @returns {{ status: number, output: string }}
 */
export const runToolCapture = (command, args) => {
  const { status, stdout, stderr } = spawnChecked(command, args, {
    stdio: ["inherit", "pipe", "pipe"],
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status, output: `${stdout}${stderr}` };
};
