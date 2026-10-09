import path from "node:path";

/**
 * The shared body of the checks that read a built site: take the output
 * directory from the command line (defaulting to the one the build writes),
 * run the check over it, and exit with the code it returns.
 *
 * Both `check:links` and `check:a11y` are this plus one import, which is why
 * it lives here rather than being written out twice.
 *
 * @param {(outputDir: string) => number | Promise<number>} check
 * @param {string[]} [argv] - Defaults to this process's arguments
 * @returns {Promise<never>}
 */
export const runOutputCheck = async (check, argv = process.argv.slice(2)) => {
  const outputDir = path.resolve(argv[0] || "_site");
  return process.exit(await check(outputDir));
};
