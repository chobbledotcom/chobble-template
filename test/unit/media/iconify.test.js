import { describe, expect, test } from "bun:test";
import { configureIconify } from "#media/iconify.js";
import {
  createMockEleventyConfig,
  fs,
  path,
  withConfiguredMock,
  withMockFetch,
  withSubDirAsync,
} from "#test/test-utils.js";

const SAMPLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
const ICONS_SUBDIR = "src/assets/icons/iconify";
const STAR_BODY = '<path d="star-path"/>';

const iconSet = (prefix, icons, aliases) => ({
  prefix,
  width: 24,
  height: 24,
  icons,
  aliases,
});

const simpleAliasSet = (prefix) =>
  iconSet(
    prefix,
    { star: { body: STAR_BODY } },
    {
      favourite: { parent: "star" },
    },
  );

// Extract async filters once
const { icon, renderIcon, socialIcon } =
  withConfiguredMock(configureIconify)().asyncFilters;

describe("iconify", () => {
  describe("configureIconify", () => {
    test("Registers icon as an async filter", () => {
      const mockConfig = createMockEleventyConfig();
      configureIconify(mockConfig);
      expect(typeof mockConfig.asyncFilters.icon).toBe("function");
    });
  });

  describe("icon filter validation", () => {
    test("Throws for non-string input", async () => {
      await expect(icon(123)).rejects.toThrow(/Invalid icon identifier/);
      await expect(icon(null)).rejects.toThrow(/Invalid icon identifier/);
      await expect(icon(undefined)).rejects.toThrow(/Invalid icon identifier/);
    });

    test("Throws for string without colon", async () => {
      await expect(icon("invalid")).rejects.toThrow(/Invalid icon identifier/);
    });

    test("Throws for empty prefix", async () => {
      await expect(icon(":name")).rejects.toThrow(/Invalid icon identifier/);
    });

    test("Throws for empty name", async () => {
      await expect(icon("prefix:")).rejects.toThrow(/Invalid icon identifier/);
    });
  });

  describe("icon filter disk cache", () => {
    test("Reads icon from disk when cached", () =>
      withSubDirAsync(
        "iconify-cached",
        `${ICONS_SUBDIR}/mdi`,
        async ({ tempDir, subDir }) => {
          fs.writeFileSync(path.join(subDir, "home.svg"), SAMPLE_SVG);
          const result = await icon("mdi:home", tempDir);
          expect(result).toBe(SAMPLE_SVG);
        },
      ));

    test("Normalizes icon name with underscores to hyphens", () =>
      withSubDirAsync(
        "iconify-underscore",
        `${ICONS_SUBDIR}/hugeicons`,
        async ({ tempDir, subDir }) => {
          fs.writeFileSync(path.join(subDir, "help-circle.svg"), SAMPLE_SVG);
          const result = await icon("hugeicons:help_circle", tempDir);
          expect(result).toBe(SAMPLE_SVG);
        },
      ));

    test("Normalizes icon name to lowercase", () =>
      withSubDirAsync(
        "iconify-lowercase",
        `${ICONS_SUBDIR}/mdi`,
        async ({ tempDir, subDir }) => {
          fs.writeFileSync(path.join(subDir, "arrow-left.svg"), SAMPLE_SVG);
          const result = await icon("MDI:Arrow_Left", tempDir);
          expect(result).toBe(SAMPLE_SVG);
        },
      ));

    test("Trims whitespace from prefix and name", () =>
      withSubDirAsync(
        "iconify-trim",
        `${ICONS_SUBDIR}/lucide`,
        async ({ tempDir, subDir }) => {
          fs.writeFileSync(path.join(subDir, "settings.svg"), SAMPLE_SVG);
          const result = await icon("  lucide : settings  ", tempDir);
          expect(result).toBe(SAMPLE_SVG);
        },
      ));

    test("Converts spaces in name to hyphens", () =>
      withSubDirAsync(
        "iconify-spaces",
        `${ICONS_SUBDIR}/custom`,
        async ({ tempDir, subDir }) => {
          fs.writeFileSync(path.join(subDir, "icon-name.svg"), SAMPLE_SVG);
          const result = await icon("custom:icon name", tempDir);
          expect(result).toBe(SAMPLE_SVG);
        },
      ));
  });

  describe("icon filter fetch and save", () => {
    test("Fetches icon from API when not cached", () =>
      withSubDirAsync("iconify-fetch", "", async ({ tempDir }) =>
        withMockFetch(SAMPLE_SVG, {}, async () => {
          const result = await icon("test:icon", tempDir);
          expect(result).toBe(SAMPLE_SVG);
        }),
      ));

    test("Composes SVG from CDN icon set", () =>
      withSubDirAsync("iconify-cdn", "", async ({ tempDir }) =>
        withMockFetch(
          iconSet("mdi", { star: { body: STAR_BODY } }),
          {},
          async () => {
            const result = await icon("mdi:star", tempDir);
            expect(result).toBe(
              `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">${STAR_BODY}</svg>`,
            );
          },
        ),
      ));

    test("Resolves aliases against the CDN icon set", () =>
      withSubDirAsync("iconify-cdn-alias", "", async ({ tempDir }) =>
        withMockFetch(simpleAliasSet("lucide"), {}, async () => {
          const result = await icon("lucide:favourite", tempDir);
          expect(result).toContain(STAR_BODY);
        }),
      ));

    test("Caches the resolved alias", () =>
      withSubDirAsync("iconify-cdn-alias-cache", "", async ({ tempDir }) =>
        withMockFetch(simpleAliasSet("fa"), {}, async () => {
          await icon("fa:favourite", tempDir);
          expect(
            fs.existsSync(
              path.join(tempDir, ICONS_SUBDIR, "fa", "favourite.svg"),
            ),
          ).toBe(true);
        }),
      ));

    test("Alias dimensions override the base icon from the CDN", () =>
      withSubDirAsync("iconify-cdn-alias-size", "", async ({ tempDir }) =>
        withMockFetch(
          iconSet(
            "bi",
            { star: { body: STAR_BODY, width: 20, height: 20 } },
            { favourite: { parent: "star", width: 16, height: 16 } },
          ),
          {},
          async () => {
            const result = await icon("bi:favourite", tempDir);
            expect(result).toContain('viewBox="0 0 16 16"');
          },
        ),
      ));

    test("Nested alias dimensions override the parent alias from the CDN", () =>
      withSubDirAsync("iconify-cdn-nested-alias", "", async ({ tempDir }) =>
        withMockFetch(
          iconSet(
            "cil",
            { star: { body: STAR_BODY, width: 20, height: 20 } },
            {
              small: { parent: "star", width: 8, height: 8 },
              favourite: { parent: "small", width: 16, height: 16 },
            },
          ),
          {},
          async () => {
            const result = await icon("cil:favourite", tempDir);
            expect(result).toContain('viewBox="0 0 16 16"');
          },
        ),
      ));

    test("Falls back to the API when the resolved icon is transformed", () =>
      withSubDirAsync("iconify-cdn-transform", "", async ({ tempDir }) =>
        withMockFetch(
          iconSet(
            "ph",
            { star: { body: STAR_BODY } },
            {
              flipped: { parent: "star", hFlip: true },
            },
          ),
          {},
          async () => {
            await expect(icon("ph:flipped", tempDir)).rejects.toThrow(
              /Invalid response/,
            );
            expect(
              fs.existsSync(
                path.join(tempDir, ICONS_SUBDIR, "ph", "flipped.svg"),
              ),
            ).toBe(false);
          },
        ),
      ));

    test("Uses icon-level sizes over set defaults from the CDN", () =>
      withSubDirAsync("iconify-cdn-sizes", "", async ({ tempDir }) =>
        withMockFetch(
          iconSet("tabler", {
            flag: { body: '<path d="flag-path"/>', width: 16, height: 16 },
          }),
          {},
          async () => {
            const result = await icon("tabler:flag", tempDir);
            expect(result).toContain('viewBox="0 0 16 16"');
          },
        ),
      ));

    test("Saves fetched icon to disk", () =>
      withSubDirAsync("iconify-save", "", async ({ tempDir }) =>
        withMockFetch(SAMPLE_SVG, {}, async () => {
          await icon("newprefix:newicon", tempDir);
          const savedPath = path.join(
            tempDir,
            ICONS_SUBDIR,
            "newprefix",
            "newicon.svg",
          );
          expect(fs.existsSync(savedPath)).toBe(true);
          expect(fs.readFileSync(savedPath, "utf-8")).toBe(SAMPLE_SVG);
        }),
      ));

    test("Creates directory structure when saving", () =>
      withSubDirAsync("iconify-mkdir", "", async ({ tempDir }) =>
        withMockFetch(SAMPLE_SVG, {}, async () => {
          await icon("brand:newicon", tempDir);
          const expectedDir = path.join(tempDir, ICONS_SUBDIR, "brand");
          expect(fs.existsSync(expectedDir)).toBe(true);
        }),
      ));

    test("Throws when API returns error status", () =>
      withSubDirAsync("iconify-error", "", async ({ tempDir }) =>
        withMockFetch("Not Found", { ok: false, status: 404 }, async () => {
          await expect(icon("notfound:icon", tempDir)).rejects.toThrow(
            /Failed to fetch icon.*Status: 404/,
          );
        }),
      ));

    test("Throws when API returns invalid SVG", () =>
      withSubDirAsync("iconify-invalid", "", async ({ tempDir }) =>
        withMockFetch("This is not an SVG", {}, async () => {
          await expect(icon("invalid:response", tempDir)).rejects.toThrow(
            /Invalid response.*Expected SVG/,
          );
        }),
      ));
  });

  describe("renderIcon filter", () => {
    test("Registers renderIcon as an async filter", () => {
      expect(typeof renderIcon).toBe("function");
    });

    test("Returns empty string for falsy values", async () => {
      expect(await renderIcon(null)).toBe("");
      expect(await renderIcon(undefined)).toBe("");
      expect(await renderIcon("")).toBe("");
    });

    test("Returns img tag for paths starting with /", async () => {
      expect(await renderIcon("/images/icon.svg")).toBe(
        '<img src="/images/icon.svg" alt="">',
      );
    });

    test("Passes through raw content unchanged", async () => {
      expect(await renderIcon("&#128640;")).toBe("&#128640;");
      expect(await renderIcon("🚀")).toBe("🚀");
      expect(await renderIcon("plain text")).toBe("plain text");
    });

    test("Passes through URLs with colons and slashes", async () => {
      expect(await renderIcon("https://example.com")).toBe(
        "https://example.com",
      );
      expect(await renderIcon("http://test.com/icon")).toBe(
        "http://test.com/icon",
      );
    });

    test("Fetches SVG for Iconify IDs via renderIcon", () =>
      withSubDirAsync("render-iconify", "", async () =>
        withMockFetch(SAMPLE_SVG, {}, async () => {
          const result = await renderIcon("test:icon");
          expect(result).toBe(SAMPLE_SVG);
        }),
      ));
  });

  describe("socialIcon filter", () => {
    test("Registers socialIcon as an async filter", () => {
      expect(typeof socialIcon).toBe("function");
    });

    test("Throws for platform not in social-icons.json", async () => {
      await expect(socialIcon("NonExistentPlatform")).rejects.toThrow(
        /No social icon defined for "NonExistentPlatform"/,
      );
    });

    test("Throws with helpful message suggesting to add entry", async () => {
      await expect(socialIcon("Myspace")).rejects.toThrow(
        /Add an entry for "myspace" in src\/_data\/social-icons\.json/,
      );
    });

    test("Looks up icon for known platform and fetches SVG", () =>
      withSubDirAsync("social-icon-fetch", "", async ({ tempDir }) =>
        withMockFetch(SAMPLE_SVG, {}, async () => {
          const result = await socialIcon("Github", tempDir);
          expect(result).toBe(SAMPLE_SVG);
        }),
      ));

    test("Normalizes platform name to lowercase", () =>
      withSubDirAsync("social-icon-case", "", async ({ tempDir }) =>
        withMockFetch(SAMPLE_SVG, {}, async () => {
          const result = await socialIcon("GITHUB", tempDir);
          expect(result).toBe(SAMPLE_SVG);
        }),
      ));

    test("Trims whitespace from platform name", () =>
      withSubDirAsync("social-icon-trim", "", async ({ tempDir }) =>
        withMockFetch(SAMPLE_SVG, {}, async () => {
          const result = await socialIcon("  Github  ", tempDir);
          expect(result).toBe(SAMPLE_SVG);
        }),
      ));
  });
});
