import { describe, expect, test } from "vitest";
import siteData from "#data/site.json" with { type: "json" };
import socialIcons from "#data/social-icons.json" with { type: "json" };
import { iconFilePath } from "#media/iconify.js";
import { main, saveIcons } from "#scripts/save-iconify-icons.js";
import {
  captureConsoleLogAsync,
  fs,
  path,
  withMockFetch,
  withSubDirAsync,
} from "#test/test-utils.js";

const SAMPLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';

/** Icons the fixture site's social links need, which every run saves. */
const SOCIAL_ICON_IDS = Object.keys(siteData.socials)
  .map((platform) => socialIcons[platform.toLowerCase()])
  .filter(Boolean);

/**
 * Run saveIcons against a temp site whose src/ holds the given files.
 * @param {string} name
 * @param {Record<string, string>} files - Paths under src/ mapped to content
 * @param {(site: { tempDir: string, subDir: string }) => Promise<void>} run
 */
const withSite = (name, files, run) =>
  withSubDirAsync(name, "src", (site) => {
    for (const [file, content] of Object.entries(files)) {
      const filePath = path.join(site.subDir, file);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
    }
    return withMockFetch(SAMPLE_SVG, {}, () => run(site));
  });

describe("save-iconify-icons", () => {
  test("saves the icons referenced in content files", () =>
    withSite(
      "save-icons-content",
      { "pages/home.md": "icon: \"mdi:home\"\nicon: 'mdi:phone'" },
      async ({ tempDir }) => {
        const result = await saveIcons([], tempDir);
        expect(result.saved).toEqual(
          expect.arrayContaining(["mdi:home", "mdi:phone"]),
        );
        expect(fs.readFileSync(iconFilePath("mdi:home", tempDir), "utf8")).toBe(
          SAMPLE_SVG,
        );
      },
    ));

  test("saves the icons for the site's social links", () =>
    withSite("save-icons-social", {}, async ({ tempDir }) => {
      const result = await saveIcons([], tempDir);
      expect(SOCIAL_ICON_IDS.length).toBeGreaterThan(0);
      expect(result.saved.toSorted()).toEqual(SOCIAL_ICON_IDS.toSorted());
    }));

  test("reports icons already in the cache as cached, not saved", () =>
    withSite(
      "save-icons-cached",
      { "pages/home.md": 'icon: "mdi:home"' },
      async ({ tempDir }) => {
        await saveIcons([], tempDir);
        const second = await saveIcons([], tempDir);
        expect(second.saved).toEqual([]);
        expect(second.cached).toContain("mdi:home");
      },
    ));

  test.each([
    {
      name: "icon values that are image paths or literal text",
      files: { "pages/home.md": 'icon: "/images/logo.svg"\nicon: "★"' },
    },
    {
      name: "files that are not content or data",
      files: { "script.js": 'icon: "mdi:from-js"' },
    },
    {
      name: "dependencies and dot-directories",
      files: {
        "node_modules/pkg/readme.md": 'icon: "mdi:from-dependency"',
        ".cache/page.md": 'icon: "mdi:from-dot-dir"',
      },
    },
  ])("skips $name", ({ files }) =>
    withSite("save-icons-skipped", files, async ({ tempDir }) => {
      const result = await saveIcons([], tempDir);
      expect(result.saved.toSorted()).toEqual(SOCIAL_ICON_IDS.toSorted());
    }));

  test("saves icons named as arguments and scans the directories given", () =>
    withSite(
      "save-icons-args",
      {
        "pages/home.md": 'icon: "mdi:in-src"',
        "extra/page.md": 'icon: "mdi:in-extra"',
      },
      async ({ tempDir, subDir }) => {
        const result = await saveIcons(
          ["mdi:named", path.join(subDir, "extra")],
          tempDir,
        );
        expect(result.saved).toEqual(
          expect.arrayContaining(["mdi:named", "mdi:in-extra"]),
        );
        expect(result.saved).not.toContain("mdi:in-src");
      },
    ));

  test("fails when an icon cannot be fetched", () =>
    withSubDirAsync("save-icons-failure", "src", ({ tempDir }) =>
      withMockFetch("", { ok: false, status: 404 }, () =>
        expect(saveIcons(["mdi:missing"], tempDir)).rejects.toThrow(
          /Failed to fetch icon "mdi:missing"/,
        ),
      ),
    ));

  test("prints what a run saved and what was already cached", () =>
    withSite(
      "save-icons-main",
      { "pages/home.md": 'icon: "mdi:home"' },
      async ({ tempDir }) => {
        await saveIcons(["mdi:home"], tempDir);
        const logs = await captureConsoleLogAsync(() =>
          main(["mdi:star"], tempDir),
        );
        const output = logs.join("\n").split("\n");
        expect(output[0]).toBe(
          `Already cached: ${SOCIAL_ICON_IDS.length + 1} icons`,
        );
        expect(output.slice(1)).toEqual(["Saved: 1 icons", "  mdi:star"]);
      },
    ));
});
