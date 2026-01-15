import { describe, expect, test } from "bun:test";
import { configureIconify } from "#media/iconify.js";
import {
  cleanupTempDir,
  createMockEleventyConfig,
  createTempDir,
  fs,
  path,
} from "#test/test-utils.js";

// ============================================
// Test Fixtures
// ============================================

const SAMPLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
const ICONS_SUBDIR = "src/assets/icons/iconify";

/** Create temp directory with icons subdirectory structure */
const withIconDir = (name, prefix = "") => {
  const tempDir = createTempDir(name);
  const iconsDir = path.join(tempDir, ICONS_SUBDIR, prefix);
  if (prefix) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  return { tempDir, iconsDir, cleanup: () => cleanupTempDir(tempDir) };
};

/** Mock fetch for testing network calls */
const mockFetch = (responseData, options = {}) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: options.ok !== false,
    status: options.status || 200,
    text: async () => responseData,
  });
  return () => {
    globalThis.fetch = originalFetch;
  };
};

/** Get configured icon filter for testing */
const getIconFilter = () => {
  const mockConfig = createMockEleventyConfig();
  configureIconify(mockConfig);
  return mockConfig.asyncFilters.icon;
};

// ============================================
// Tests
// ============================================

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
    test("Reads icon from disk when cached", async () => {
      const { tempDir, iconsDir, cleanup } = withIconDir(
        "iconify-cached",
        "mdi",
      );
      fs.writeFileSync(path.join(iconsDir, "home.svg"), SAMPLE_SVG);

      const icon = getIconFilter();
      const result = await icon("mdi:home", tempDir);
      expect(result).toBe(SAMPLE_SVG);
      cleanup();
    });

    test("Normalizes icon name with underscores to hyphens", async () => {
      const { tempDir, iconsDir, cleanup } = withIconDir(
        "iconify-underscore",
        "hugeicons",
      );
      fs.writeFileSync(path.join(iconsDir, "help-circle.svg"), SAMPLE_SVG);

      const icon = getIconFilter();
      const result = await icon("hugeicons:help_circle", tempDir);
      expect(result).toBe(SAMPLE_SVG);
      cleanup();
    });

    test("Normalizes icon name to lowercase", async () => {
      const { tempDir, iconsDir, cleanup } = withIconDir(
        "iconify-lowercase",
        "mdi",
      );
      fs.writeFileSync(path.join(iconsDir, "arrow-left.svg"), SAMPLE_SVG);

      const icon = getIconFilter();
      const result = await icon("MDI:Arrow_Left", tempDir);
      expect(result).toBe(SAMPLE_SVG);
      cleanup();
    });

    test("Trims whitespace from prefix and name", async () => {
      const { tempDir, iconsDir, cleanup } = withIconDir(
        "iconify-trim",
        "lucide",
      );
      fs.writeFileSync(path.join(iconsDir, "settings.svg"), SAMPLE_SVG);

      const icon = getIconFilter();
      const result = await icon("  lucide : settings  ", tempDir);
      expect(result).toBe(SAMPLE_SVG);
      cleanup();
    });

    test("Converts spaces in name to hyphens", async () => {
      const { tempDir, iconsDir, cleanup } = withIconDir(
        "iconify-spaces",
        "custom",
      );
      fs.writeFileSync(path.join(iconsDir, "icon-name.svg"), SAMPLE_SVG);

      const icon = getIconFilter();
      const result = await icon("custom:icon name", tempDir);
      expect(result).toBe(SAMPLE_SVG);
      cleanup();
    });
  });

  describe("icon filter fetch and save", () => {
    test("Fetches icon from API when not cached", async () => {
      const { tempDir, cleanup } = withIconDir("iconify-fetch");
      const restoreFetch = mockFetch(SAMPLE_SVG);

      const icon = getIconFilter();
      const result = await icon("test:icon", tempDir);

      expect(result).toBe(SAMPLE_SVG);
      restoreFetch();
      cleanup();
    });

    test("Saves fetched icon to disk", async () => {
      const { tempDir, cleanup } = withIconDir("iconify-save");
      const restoreFetch = mockFetch(SAMPLE_SVG);

      const icon = getIconFilter();
      await icon("newprefix:newicon", tempDir);

      const savedPath = path.join(
        tempDir,
        ICONS_SUBDIR,
        "newprefix",
        "newicon.svg",
      );
      expect(fs.existsSync(savedPath)).toBe(true);
      expect(fs.readFileSync(savedPath, "utf-8")).toBe(SAMPLE_SVG);

      restoreFetch();
      cleanup();
    });

    test("Creates directory structure when saving", async () => {
      const { tempDir, cleanup } = withIconDir("iconify-mkdir");
      const restoreFetch = mockFetch(SAMPLE_SVG);

      const icon = getIconFilter();
      await icon("brand:newicon", tempDir);

      const expectedDir = path.join(tempDir, ICONS_SUBDIR, "brand");
      expect(fs.existsSync(expectedDir)).toBe(true);

      restoreFetch();
      cleanup();
    });

    test("Throws when API returns error status", async () => {
      const { tempDir, cleanup } = withIconDir("iconify-error");
      const restoreFetch = mockFetch("Not Found", { ok: false, status: 404 });

      const icon = getIconFilter();
      await expect(icon("notfound:icon", tempDir)).rejects.toThrow(
        /Failed to fetch icon.*Status: 404/,
      );

      restoreFetch();
      cleanup();
    });

    test("Throws when API returns invalid SVG", async () => {
      const { tempDir, cleanup } = withIconDir("iconify-invalid");
      const restoreFetch = mockFetch("This is not an SVG");

      const icon = getIconFilter();
      await expect(icon("invalid:response", tempDir)).rejects.toThrow(
        /Invalid response.*Expected SVG/,
      );

      restoreFetch();
      cleanup();
    });
  });
});
