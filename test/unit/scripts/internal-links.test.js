import { describe, expect, mock, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  findBrokenInternalLinks,
  formatBrokenInternalLink,
  runInternalLinkCheck,
} from "#scripts/internal-links.js";
import { withTempDir } from "#test/test-utils.js";

const writeOutput = (outputDir, relativePath, content = "") => {
  const filePath = path.join(outputDir, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
};

const runCheck = (outputDir) => {
  const output = { log: mock(), error: mock() };
  return { status: runInternalLinkCheck(outputDir, output), output };
};

describe("internal link validation", () => {
  test("accepts generated pages, assets, relative paths, and redirects", () => {
    withTempDir("internal-links-valid", (outputDir) => {
      writeOutput(
        outputDir,
        "index.html",
        `
          <a href="/about/">About</a>
          <a href="/products">Products</a>
          <a href="/legacy/">Redirect</a>
          <a href="/feed.xml">Feed</a>
          <a href="https://example.com/missing">External</a>
          <a href="//cdn.example.com/missing">CDN</a>
          <a href="mailto:test@example.com">Email</a>
          <a href="tel:+44123456789">Phone</a>
          <a href="data:text/plain,test">Data</a>
          <a href="/missing?preview=true">Preview</a>
          <a href="/missing#section">Section</a>
          <a>No href</a>
        `,
      );
      writeOutput(outputDir, "about/index.html");
      writeOutput(outputDir, "products/index.html");
      writeOutput(outputDir, "feed.xml");
      writeOutput(outputDir, "legacy/index.html");
      writeOutput(
        outputDir,
        "docs/index.html",
        '<a href="manual.pdf">Manual</a>',
      );
      writeOutput(outputDir, "docs/manual.pdf");

      expect(findBrokenInternalLinks(outputDir)).toEqual([]);
    });
  });

  test("reports missing pages and assets in stable source order", () => {
    withTempDir("internal-links-missing", (outputDir) => {
      writeOutput(
        outputDir,
        "z/index.html",
        '<a href="/missing-page/">Missing page</a>',
      );
      writeOutput(
        outputDir,
        "a/index.html",
        '<link rel="stylesheet" href="/missing.css">',
      );

      expect(findBrokenInternalLinks(outputDir)).toEqual([
        {
          source: "a/index.html",
          href: "/missing.css",
          target: "missing.css",
        },
        {
          source: "z/index.html",
          href: "/missing-page/",
          target: "missing-page/",
        },
      ]);
    });
  });

  test("does not validate links emitted by redirect documents", () => {
    withTempDir("internal-links-redirect", (outputDir) => {
      writeOutput(
        outputDir,
        "legacy/index.html",
        `
          <meta http-equiv="refresh" content="0; url=/not-generated/">
          <a href="/not-generated/">Continue</a>
        `,
      );
      expect(findBrokenInternalLinks(outputDir)).toEqual([]);
    });
  });

  test("throws when the generated site directory is missing", () => {
    withTempDir("internal-links-no-output", (tempDir) => {
      expect(() =>
        findBrokenInternalLinks(path.join(tempDir, "missing")),
      ).toThrow("Generated site directory does not exist");
    });
  });

  test("formats failures and returns a non-zero status", () => {
    withTempDir("internal-links-status-fail", (outputDir) => {
      writeOutput(outputDir, "index.html", '<a href="/missing/">Missing</a>');
      const { status, output } = runCheck(outputDir);
      expect(status).toBe(1);
      expect(output.error).toHaveBeenCalledWith(
        "Broken internal links:\nindex.html: /missing/ -> missing/",
      );
      expect(
        formatBrokenInternalLink({
          source: "index.html",
          href: "/",
          target: "",
        }),
      ).toBe("index.html: / -> index.html");
    });
  });

  test("returns success when all links resolve", () => {
    withTempDir("internal-links-status-pass", (outputDir) => {
      writeOutput(outputDir, "index.html");
      const { status, output } = runCheck(outputDir);
      expect(status).toBe(0);
      expect(output.log).toHaveBeenCalledWith("Internal link check passed");
    });
  });
});
