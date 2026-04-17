import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { configureFileInfo, fileInfo } from "#eleventy/file-info.js";
import { createMockEleventyConfig, withTempDir } from "#test/test-utils.js";

const writeFixtureFile = (baseDir, urlPath, bytes) => {
  const rel = urlPath.replace(/^\//, "");
  const full = path.join(baseDir, "src", rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, Buffer.alloc(bytes));
};

const sizeHumanFor = (bytes) =>
  withTempDir("file-info-size", (tempDir) => {
    writeFixtureFile(tempDir, "/files/x.pdf", bytes);
    return fileInfo("/files/x.pdf", tempDir).sizeHuman;
  });

describe("fileInfo sizeHuman formatting", () => {
  test("formats bytes under 1 KB with the B suffix", () => {
    expect(sizeHumanFor(0)).toBe("0 B");
    expect(sizeHumanFor(512)).toBe("512 B");
  });

  test("formats kilobytes with one decimal below 10 KB", () => {
    expect(sizeHumanFor(1024)).toBe("1 KB");
    expect(sizeHumanFor(1536)).toBe("1.5 KB");
  });

  test("drops decimals once the value reaches 10 of its unit", () => {
    expect(sizeHumanFor(10 * 1024)).toBe("10 KB");
    expect(sizeHumanFor(Math.round(2.4 * 1024 * 1024))).toBe("2.4 MB");
    expect(sizeHumanFor(15 * 1024 * 1024)).toBe("15 MB");
  });
});

describe("fileInfo metadata", () => {
  test("returns size, sizeHuman, extension, and icon for a PDF", () => {
    withTempDir("file-info-pdf", (tempDir) => {
      writeFixtureFile(tempDir, "/files/guide.pdf", 2048);

      const info = fileInfo("/files/guide.pdf", tempDir);

      expect(info.size).toBe(2048);
      expect(info.sizeHuman).toBe("2 KB");
      expect(info.extension).toBe("pdf");
      expect(info.icon).toBe("hugeicons:pdf-02");
    });
  });

  test("maps zip-family extensions to the archive icon", () => {
    withTempDir("file-info-zip", (tempDir) => {
      writeFixtureFile(tempDir, "/downloads/bundle.zip", 10);

      const info = fileInfo("/downloads/bundle.zip", tempDir);

      expect(info.extension).toBe("zip");
      expect(info.icon).toBe("hugeicons:zip-01");
    });
  });

  test("falls back to the generic file icon for unknown extensions", () => {
    withTempDir("file-info-unknown", (tempDir) => {
      writeFixtureFile(tempDir, "/files/data.xyz", 1);

      const info = fileInfo("/files/data.xyz", tempDir);

      expect(info.icon).toBe("hugeicons:file-01");
    });
  });

  test("accepts paths without a leading slash", () => {
    withTempDir("file-info-no-slash", (tempDir) => {
      writeFixtureFile(tempDir, "/files/doc.pdf", 1);

      const info = fileInfo("files/doc.pdf", tempDir);

      expect(info.extension).toBe("pdf");
    });
  });

  test("throws a clear error when the file is missing", () => {
    withTempDir("file-info-missing", (tempDir) => {
      expect(() => fileInfo("/files/missing.pdf", tempDir)).toThrow(
        "downloads block: file not found",
      );
    });
  });
});

describe("configureFileInfo", () => {
  test("registers a fileInfo filter that resolves files", () => {
    withTempDir("file-info-configure", (tempDir) => {
      writeFixtureFile(tempDir, "/files/report.pdf", 1024);
      const mockConfig = createMockEleventyConfig();

      configureFileInfo(mockConfig);

      const registered = mockConfig.filters.fileInfo;
      expect(typeof registered).toBe("function");
      const info = registered("/files/report.pdf", tempDir);
      expect(info.extension).toBe("pdf");
      expect(info.sizeHuman).toBe("1 KB");
    });
  });
});
