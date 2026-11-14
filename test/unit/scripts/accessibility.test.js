// @vitest-environment node
/**
 * The accessibility check is what stops an inaccessible page reaching a build
 * artifact, so these tests give it pages with known defects and read back what
 * it reports — not what axe reports internally, but the report a person fixing
 * the page actually sees.
 *
 * These run in Node rather than the suite's happy-dom environment, which is
 * the environment the check itself requires - see scripts/accessibility.js.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import {
  auditHtml,
  auditSite,
  formatReport,
  runAccessibilityCheck,
  WCAG_AA_TAGS,
} from "#scripts/accessibility.js";
import { withTempDirAsync } from "#test/test-utils.js";

/** A page that passes every rule this check runs. */
const conformingPage = (body = "<h1>A heading</h1>") =>
  `<!DOCTYPE html><html lang="en"><head><title>A page</title></head><body><main>${body}</main></body></html>`;

const writePage = (dir, relativePath, html) => {
  const filePath = path.join(dir, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, html);
};

const rulesIn = (violations) => violations.map((violation) => violation.rule);

describe("auditHtml", () => {
  test("reports nothing for a conforming page", async () => {
    expect(await auditHtml(conformingPage(), "index.html")).toEqual([]);
  });

  test("reports an image with no alternative text", async () => {
    const violations = await auditHtml(
      conformingPage('<h1>Photos</h1><img src="/cat.jpg">'),
      "index.html",
    );
    expect(rulesIn(violations)).toContain("image-alt");
  });

  test("reports a page whose language is not declared", async () => {
    const violations = await auditHtml(
      "<!DOCTYPE html><html><head><title>A page</title></head><body><main><h1>Hi</h1></main></body></html>",
      "index.html",
    );
    expect(rulesIn(violations)).toContain("html-has-lang");
  });

  test("names the page and the element each violation is on", async () => {
    const [violation] = await auditHtml(
      conformingPage('<h1>Photos</h1><img src="/cat.jpg">'),
      "gallery/index.html",
    );
    expect(violation.page).toBe("gallery/index.html");
    // The exact selector is axe's to choose; that it points at the image is
    // what makes the report actionable.
    expect(violation.targets).toHaveLength(1);
    expect(violation.targets[0]).toContain("img");
    expect(violation.helpUrl).toContain("image-alt");
  });

  test("audits each page on its own, so one page's markup cannot mask another's", async () => {
    const broken = conformingPage('<h1>Photos</h1><img src="/cat.jpg">');
    expect(rulesIn(await auditHtml(broken, "first.html"))).toContain(
      "image-alt",
    );
    expect(await auditHtml(conformingPage(), "second.html")).toEqual([]);
  });
});

describe("auditSite", () => {
  test("counts every page and gathers the violations across them", async () => {
    await withTempDirAsync("a11y-site", async (dir) => {
      writePage(dir, "index.html", conformingPage());
      writePage(
        dir,
        "about/index.html",
        conformingPage('<h1>About</h1><img src="/team.jpg">'),
      );
      const report = await auditSite(dir);
      expect(report.pageCount).toBe(2);
      expect(rulesIn(report.violations)).toEqual(["image-alt"]);
      expect(report.violations[0].page).toBe("about/index.html");
    });
  });

  test("refuses a directory with no pages rather than reporting a clean run", async () => {
    await withTempDirAsync("a11y-empty", async (dir) => {
      await expect(auditSite(dir)).rejects.toThrow(/No HTML pages found/);
    });
  });
});

describe("formatReport", () => {
  test("says how many pages were checked when nothing is wrong", () => {
    expect(formatReport({ pageCount: 12, violations: [] })).toContain(
      "12 page(s)",
    );
  });

  test("gives each violation its page, rule, help text, elements, and link", () => {
    const report = formatReport({
      pageCount: 1,
      violations: [
        {
          page: "about/index.html",
          rule: "image-alt",
          impact: "critical",
          help: "Images must have alternate text",
          helpUrl: "https://example.invalid/image-alt",
          targets: ['img[src$="team.jpg"]'],
        },
      ],
    });
    expect(report).toContain("about/index.html: image-alt (critical)");
    expect(report).toContain("Images must have alternate text");
    expect(report).toContain('at img[src$="team.jpg"]');
    expect(report).toContain("https://example.invalid/image-alt");
  });
});

describe("runAccessibilityCheck", () => {
  /** Check a one-page site, and hand back its exit code and what it said. */
  const checkOnePage = (name, html) =>
    withTempDirAsync(name, async (dir) => {
      writePage(dir, "index.html", html);
      const output = { log: vi.fn(), error: vi.fn() };
      const status = await runAccessibilityCheck(dir, output);
      return { status, output };
    });

  test("passes a conforming site and says so", async () => {
    const { status, output } = await checkOnePage(
      "a11y-pass",
      conformingPage(),
    );
    expect(status).toBe(0);
    expect(output.log.mock.calls[0][0]).toContain("passed");
    expect(output.error).not.toHaveBeenCalled();
  });

  test("fails a site with a violation and reports it as an error", async () => {
    const { status, output } = await checkOnePage(
      "a11y-fail",
      conformingPage('<img src="/cat.jpg">'),
    );
    expect(status).toBe(1);
    expect(output.error.mock.calls[0][0]).toContain("image-alt");
    expect(output.log).not.toHaveBeenCalled();
  });
});

describe("WCAG_AA_TAGS", () => {
  test("covers WCAG 2.2 AA by including each earlier level it builds on", () => {
    expect(WCAG_AA_TAGS).toEqual([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22aa",
    ]);
  });
});
