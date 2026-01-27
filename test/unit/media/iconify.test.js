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

// Create configured mock using curried helper
const createIconifyMock = withConfiguredMock(configureIconify);

const getIconFilter = () => createIconifyMock().asyncFilters.icon;
const getRenderIconFilter = () => createIconifyMock().asyncFilters.renderIcon;

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
      const icon = getIconFilter();
      await expect(icon(123)).rejects.toThrow(/Invalid icon identifier/);
      await expect(icon(null)).rejects.toThrow(/Invalid icon identifier/);
      await expect(icon(undefined)).rejects.toThrow(/Invalid icon identifier/);
    });

    test("Throws for string without colon", async () => {
      const icon = getIconFilter();
      await expect(icon("invalid")).rejects.toThrow(/Invalid icon identifier/);
    });

    test("Throws for empty prefix", async () => {
      const icon = getIconFilter();
      await expect(icon(":name")).rejects.toThrow(/Invalid icon identifier/);
    });

    test("Throws for empty name", async () => {
      const icon = getIconFilter();
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
          const result = await getIconFilter()("mdi:home", tempDir);
          expect(result).toBe(SAMPLE_SVG);
        },
      ));

    test("Normalizes icon name with underscores to hyphens", () =>
      withSubDirAsync(
        "iconify-underscore",
        `${ICONS_SUBDIR}/hugeicons`,
        async ({ tempDir, subDir }) => {
          fs.writeFileSync(path.join(subDir, "help-circle.svg"), SAMPLE_SVG);
          const result = await getIconFilter()(
            "hugeicons:help_circle",
            tempDir,
          );
          expect(result).toBe(SAMPLE_SVG);
        },
      ));

    test("Normalizes icon name to lowercase", () =>
      withSubDirAsync(
        "iconify-lowercase",
        `${ICONS_SUBDIR}/mdi`,
        async ({ tempDir, subDir }) => {
          fs.writeFileSync(path.join(subDir, "arrow-left.svg"), SAMPLE_SVG);
          const result = await getIconFilter()("MDI:Arrow_Left", tempDir);
          expect(result).toBe(SAMPLE_SVG);
        },
      ));

    test("Trims whitespace from prefix and name", () =>
      withSubDirAsync(
        "iconify-trim",
        `${ICONS_SUBDIR}/lucide`,
        async ({ tempDir, subDir }) => {
          fs.writeFileSync(path.join(subDir, "settings.svg"), SAMPLE_SVG);
          const result = await getIconFilter()(
            "  lucide : settings  ",
            tempDir,
          );
          expect(result).toBe(SAMPLE_SVG);
        },
      ));

    test("Converts spaces in name to hyphens", () =>
      withSubDirAsync(
        "iconify-spaces",
        `${ICONS_SUBDIR}/custom`,
        async ({ tempDir, subDir }) => {
          fs.writeFileSync(path.join(subDir, "icon-name.svg"), SAMPLE_SVG);
          const result = await getIconFilter()("custom:icon name", tempDir);
          expect(result).toBe(SAMPLE_SVG);
        },
      ));
  });

  describe("icon filter fetch and save", () => {
    test("Fetches icon from API when not cached", () =>
      withSubDirAsync("iconify-fetch", "", async ({ tempDir }) =>
        withMockFetch(SAMPLE_SVG, {}, async () => {
          const result = await getIconFilter()("test:icon", tempDir);
          expect(result).toBe(SAMPLE_SVG);
        }),
      ));

    test("Saves fetched icon to disk", () =>
      withSubDirAsync("iconify-save", "", async ({ tempDir }) =>
        withMockFetch(SAMPLE_SVG, {}, async () => {
          await getIconFilter()("newprefix:newicon", tempDir);
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
          await getIconFilter()("brand:newicon", tempDir);
          const expectedDir = path.join(tempDir, ICONS_SUBDIR, "brand");
          expect(fs.existsSync(expectedDir)).toBe(true);
        }),
      ));

    test("Throws when API returns error status", () =>
      withSubDirAsync("iconify-error", "", async ({ tempDir }) =>
        withMockFetch("Not Found", { ok: false, status: 404 }, async () => {
          await expect(
            getIconFilter()("notfound:icon", tempDir),
          ).rejects.toThrow(/Failed to fetch icon.*Status: 404/);
        }),
      ));

    test("Throws when API returns invalid SVG", () =>
      withSubDirAsync("iconify-invalid", "", async ({ tempDir }) =>
        withMockFetch("This is not an SVG", {}, async () => {
          await expect(
            getIconFilter()("invalid:response", tempDir),
          ).rejects.toThrow(/Invalid response.*Expected SVG/);
        }),
      ));
  });

  describe("renderIcon filter", () => {
    test("Registers renderIcon as an async filter", () => {
      expect(typeof getRenderIconFilter()).toBe("function");
    });

    test("Returns empty string for falsy values", async () => {
      const renderIcon = getRenderIconFilter();
      expect(await renderIcon(null)).toBe("");
      expect(await renderIcon(undefined)).toBe("");
      expect(await renderIcon("")).toBe("");
    });

    test("Returns img tag for paths starting with /", async () => {
      const result = await getRenderIconFilter()("/images/icon.svg");
      expect(result).toBe('<img src="/images/icon.svg" alt="">');
    });

    test("Passes through raw content unchanged", async () => {
      const renderIcon = getRenderIconFilter();
      expect(await renderIcon("&#128640;")).toBe("&#128640;");
      expect(await renderIcon("🚀")).toBe("🚀");
      expect(await renderIcon("plain text")).toBe("plain text");
    });

    test("Passes through URLs with colons and slashes", async () => {
      const renderIcon = getRenderIconFilter();
      expect(await renderIcon("https://example.com")).toBe(
        "https://example.com",
      );
      expect(await renderIcon("http://test.com/icon")).toBe(
        "http://test.com/icon",
      );
    });

    test("Fetches SVG for Iconify IDs via renderIcon", () =>
      withSubDirAsync("render-iconify", "", async ({ tempDir }) =>
        withMockFetch(SAMPLE_SVG, {}, async () => {
          const result = await getRenderIconFilter()("test:icon");
          expect(result).toBe(SAMPLE_SVG);
        }),
      ));
  });
});
