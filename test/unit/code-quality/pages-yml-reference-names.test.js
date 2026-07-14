import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import YAML from "yaml";
import { rootDir } from "#test/test-utils.js";
import {
  collectReferenceFields,
  getCollectionMap,
} from "#test/unit/utils/pages-yml-helpers.js";
import { unique } from "#toolkit/fp/array.js";

const pagesConfig = YAML.parse(
  readFileSync(join(rootDir, ".pages.yml"), "utf-8"),
);
const collections = getCollectionMap(pagesConfig);
const referenceTargets = unique(
  collectReferenceFields(pagesConfig).map(
    (reference) => reference.options.collection,
  ),
);

describe("Pages CMS reference names", () => {
  test("every referenced collection entry has name frontmatter", () => {
    for (const targetName of referenceTargets) {
      const target = collections.get(targetName);
      expect(target).toBeDefined();
      const entries = readdirSync(join(rootDir, target.path), {
        withFileTypes: true,
      }).filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".md") &&
          !target.exclude?.includes(entry.name),
      );

      for (const entry of entries) {
        const source = readFileSync(
          join(rootDir, target.path, entry.name),
          "utf-8",
        );
        expect(matter(source).data.name).toBeTruthy();
      }
    }
  });
});
