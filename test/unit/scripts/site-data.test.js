import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  collectPlaceholderDataErrors,
  validateSiteData,
} from "#scripts/site-data.js";
import { withTempDir } from "#test/test-utils.js";

const writeSource = (rootDir, relativePath, content) => {
  const filePath = join(rootDir, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
};

describe("site data validation", () => {
  test("accepts real site identity and content", () =>
    withTempDir("site-data-valid", (rootDir) => {
      writeSource(
        rootDir,
        "src/_data/site.json",
        '{"name":"Service Guide","url":"https://service.gov","description":"A public guide"}',
      );
      writeSource(
        rootDir,
        "src/pages/contact.md",
        "Contact the service team through the official support channel.",
      );

      expect(() => validateSiteData(rootDir)).not.toThrow();
    }));

  test("reports every publishable placeholder with its source line", () =>
    withTempDir("site-data-placeholders", (rootDir) => {
      writeSource(
        rootDir,
        "src/_data/meta.json",
        '{\n  "legalName": "Example Site Ltd"\n}',
      );
      writeSource(
        rootDir,
        "src/pages/contact.md",
        "Email hello@example.com\nPhone 0161 000 0000",
      );

      expect(collectPlaceholderDataErrors(rootDir)).toEqual([
        "src/_data/meta.json:2: placeholder identity",
        "src/pages/contact.md:1: reserved example domain",
        "src/pages/contact.md:2: placeholder phone number",
      ]);
    }));

  test("does not scan examples outside the site identity surface", () =>
    withTempDir("site-data-scope", (rootDir) => {
      writeSource(
        rootDir,
        "src/guide-pages/email-examples.md",
        "John Smith can use hello@example.com in documentation.",
      );

      expect(collectPlaceholderDataErrors(rootDir)).toEqual([]);
    }));

  test("fails validation when publishable placeholders remain", () =>
    withTempDir("site-data-invalid", (rootDir) => {
      writeSource(rootDir, "src/pages/contact.md", "Email hello@example.com");

      expect(() => validateSiteData(rootDir)).toThrow(
        /Placeholder site data found:[\s\S]*src\/pages\/contact\.md:1/,
      );
    }));
});
