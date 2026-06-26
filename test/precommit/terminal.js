/** Detect terminal capabilities so the runner can decide whether to show
 * live progress or prompt to push. Mirrors the tickets precommit/terminal.ts
 * checks using Node's `process.stdin.isTTY` / `process.stdout.isTTY`. */

export const currentTerminalState = () => ({
  ci: process.argv.includes("--ci") || Boolean(process.env.CI),
  stdin: Boolean(process.stdin.isTTY),
  stdout: Boolean(process.stdout.isTTY),
});

export const canPrompt = ({ ci, stdin, stdout }) => stdin && stdout && !ci;
export const canShowProgress = ({ ci, stdout }) => stdout && !ci;
