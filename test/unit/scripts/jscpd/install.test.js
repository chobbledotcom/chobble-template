import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  installedJscpd,
  installJscpd,
  installJscpdMain,
  JSCPD_VERSION,
} from "#scripts/jscpd/install.js";
import { noop, withTempDirAsync } from "#test/test-utils.js";

const FAKE_BINARY = Buffer.from("fixture jscpd musl binary");
const FAKE_SHA = createHash("sha256").update(FAKE_BINARY).digest("hex");
const OTHER_BINARY = Buffer.from("different fixture content");
const ENTRY_NAME = "package/bin/jscpd";

const installPaths = (dir) => ({
  binaryPath: join(dir, ".bin", "jscpd"),
  binDir: join(dir, ".bin"),
});

/** A tar archive (raw bytes, not gzipped) for a single entry, zero-terminated. */
const tarWith = (entryName, content) => {
  const header = Buffer.alloc(512);
  header.write(entryName, 0, "utf8");
  header.write(content.length.toString(8).padStart(11, "0"), 124, "ascii");
  const padded = Buffer.alloc(Math.ceil(content.length / 512) * 512);
  content.copy(padded);
  return Buffer.concat([header, padded, Buffer.alloc(512)]);
};

const stubTarballResponse = (tar) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      status: 200,
      arrayBuffer: async () => tar,
    })),
  );
};

/** Run a scenario against a temp install dir already holding `bytes`. */
const withStagedBinary = async (testName, bytes, run) =>
  withTempDirAsync(testName, async (dir) => {
    const paths = installPaths(dir);
    mkdirSync(paths.binDir, { recursive: true });
    writeFileSync(paths.binaryPath, bytes);
    return run(paths);
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("jscpd installer", () => {
  test("installs a verified binary on first use", async () => {
    stubTarballResponse(gzipSync(tarWith(ENTRY_NAME, FAKE_BINARY)));
    await withTempDirAsync("jscpd-install", async (dir) => {
      const paths = installPaths(dir);

      const result = await installJscpd(paths, FAKE_SHA);

      expect(result).toBe(paths.binaryPath);
      expect(readFileSync(paths.binaryPath)).toEqual(FAKE_BINARY);
      expect(statSync(paths.binaryPath).mode & 0o777).toBe(0o700);
    });
  });

  test("skips re-download when the cached binary is already verified", async () => {
    stubTarballResponse(gzipSync(tarWith(ENTRY_NAME, FAKE_BINARY)));
    await withStagedBinary("jscpd-cached", FAKE_BINARY, async (paths) => {
      await expect(installJscpd(paths, FAKE_SHA)).resolves.toBe(
        paths.binaryPath,
      );
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  test("replaces a cached binary with a wrong checksum", async () => {
    stubTarballResponse(gzipSync(tarWith(ENTRY_NAME, FAKE_BINARY)));
    await withStagedBinary("jscpd-reinstall", OTHER_BINARY, async (paths) => {
      await installJscpd(paths, FAKE_SHA);

      expect(readFileSync(paths.binaryPath)).toEqual(FAKE_BINARY);
    });
  });

  test("fails loudly when the tarball download is not a 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 404,
        arrayBuffer: async () => Buffer.alloc(0),
      })),
    );
    await withTempDirAsync("jscpd-download-error", async (dir) => {
      const paths = installPaths(dir);

      await expect(installJscpd(paths, FAKE_SHA)).rejects.toThrow(
        "Failed to download jscpd: HTTP 404",
      );
    });
  });

  test("throws when the tarball holds no package/bin/jscpd entry", async () => {
    stubTarballResponse(
      gzipSync(tarWith("package/readme.md", Buffer.from("hi"))),
    );
    await withTempDirAsync("jscpd-no-entry", async (dir) => {
      const paths = installPaths(dir);

      await expect(installJscpd(paths, FAKE_SHA)).rejects.toThrow(
        "The jscpd tarball holds no package/bin/jscpd entry",
      );
    });
  });

  test("throws on a checksum mismatch instead of keeping the bad binary", async () => {
    stubTarballResponse(gzipSync(tarWith(ENTRY_NAME, OTHER_BINARY)));
    await withTempDirAsync("jscpd-checksum", async (dir) => {
      const paths = installPaths(dir);

      await expect(installJscpd(paths, FAKE_SHA)).rejects.toThrow(
        "jscpd binary checksum mismatch",
      );
      expect(existsSync(paths.binaryPath)).toBe(false);
    });
  });

  test("installedJscpd reports only a verified binary", async () => {
    await withTempDirAsync("jscpd-check", async (dir) => {
      const paths = installPaths(dir);

      expect(installedJscpd(paths, FAKE_SHA)).toBeNull();
      mkdirSync(paths.binDir, { recursive: true });
      writeFileSync(paths.binaryPath, OTHER_BINARY);
      expect(installedJscpd(paths, FAKE_SHA)).toBeNull();
      writeFileSync(paths.binaryPath, FAKE_BINARY);
      expect(installedJscpd(paths, FAKE_SHA)).toBe(paths.binaryPath);
    });
  });

  test("main installs the binary and prints its resolved path", async () => {
    stubTarballResponse(gzipSync(tarWith(ENTRY_NAME, FAKE_BINARY)));
    const logSpy = vi.spyOn(console, "log").mockImplementation(noop);
    await withTempDirAsync("jscpd-main", async (dir) => {
      const paths = installPaths(dir);

      await installJscpdMain(paths, FAKE_SHA);

      expect(logSpy).toHaveBeenCalledWith(
        `jscpd ${JSCPD_VERSION} ready at ${resolve(paths.binaryPath)}`,
      );
    });
  });
});
