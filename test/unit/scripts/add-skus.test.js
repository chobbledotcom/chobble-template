import { describe, expect, test } from "bun:test";
import matter from "gray-matter";
import {
  addSkusToAll,
  extractSkuFromMenuItem,
  isBuyableMenuItem,
  processMenuItemFile,
} from "#bin/add-skus";
import { createFrontmatter, fs, path, withTempDir } from "#test/test-utils.js";

const SKU_PATTERN = /^[A-Z0-9]{6}$/;

const writeProduct = (dir, file, frontmatter) => {
  fs.writeFileSync(path.join(dir, file), createFrontmatter(frontmatter, ""));
};

const readFrontmatter = (dir, file) =>
  matter(fs.readFileSync(path.join(dir, file), "utf-8")).data;

const menuItemInput = (data) => ({ data, body: "", filePath: "/x.md" });

const makeSkuDirs = (tempDir) => {
  const productsDir = path.join(tempDir, "products");
  const menuItemsDir = path.join(tempDir, "menu-items");
  fs.mkdirSync(productsDir, { recursive: true });
  fs.mkdirSync(menuItemsDir, { recursive: true });
  return { productsDir, menuItemsDir };
};

const writeWidget = (productsDir, options) =>
  writeProduct(productsDir, "widget.md", { name: "Widget", options });

const expectMenuItemUnchanged = (data) => {
  const result = processMenuItemFile(menuItemInput(data), new Set());
  expect(result.modified).toBe(false);
  expect(result.skusAdded).toBe(0);
  return result;
};

describe("isBuyableMenuItem", () => {
  test("buyable when price is a single parseable amount", () => {
    expect(isBuyableMenuItem({ price: "£15.00" })).toBe(true);
    expect(isBuyableMenuItem({ price: 8 })).toBe(true);
  });

  test("not buyable when price is ambiguous, missing, or unparseable", () => {
    expect(isBuyableMenuItem({ price: "£10 / £12" })).toBe(false);
    expect(isBuyableMenuItem({ price: undefined })).toBe(false);
    expect(isBuyableMenuItem({ price: "Market price" })).toBe(false);
  });
});

describe("extractSkuFromMenuItem", () => {
  test("returns the top-level sku when present", () => {
    expect(extractSkuFromMenuItem({ data: { sku: "ABC123" } })).toEqual([
      "ABC123",
    ]);
  });

  test("returns empty when no sku", () => {
    expect(extractSkuFromMenuItem({ data: {} })).toEqual([]);
  });
});

describe("processMenuItemFile", () => {
  test("adds a sku to a buyable menu item missing one", () => {
    const result = processMenuItemFile(
      menuItemInput({ name: "Burger", price: "£15.00" }),
      new Set(["TAKEN"]),
    );
    expect(result.modified).toBe(true);
    expect(result.skusAdded).toBe(1);
    expect(result.updatedSkus.has("TAKEN")).toBe(true);

    const sku = matter(result.newContent).data.sku;
    expect(sku).toMatch(SKU_PATTERN);
    expect(sku).not.toBe("TAKEN");
  });

  test("leaves a menu item unchanged when it already has a sku", () => {
    const result = expectMenuItemUnchanged({
      name: "Burger",
      price: "£15.00",
      sku: "KEEPME",
    });
    expect(result.newContent).toBeNull();
  });

  test("skips non-buyable menu items (ambiguous price)", () => {
    expectMenuItemUnchanged({ name: "Burger", price: "£10 / £12" });
  });
});

describe("addSkusToAll end-to-end", () => {
  test("writes missing product option and menu-item SKUs, keeping global uniqueness", () =>
    withTempDir("add-skus-write", (tempDir) => {
      const { productsDir, menuItemsDir } = makeSkuDirs(tempDir);

      writeWidget(productsDir, [
        { name: "Small", unit_price: 10, sku: "WIDGETS" },
        { name: "Large", unit_price: 15 },
      ]);
      writeProduct(menuItemsDir, "burger.md", {
        name: "Beyond Burger",
        price: "£15.00",
      });
      writeProduct(menuItemsDir, "combo.md", {
        name: "Combo Deal",
        price: "£10 / £12",
      });

      const { totals } = addSkusToAll({
        dryRun: false,
        productsDir,
        menuItemsDir,
      });

      // 1 product file (Large option) + 1 menu item (burger) modified.
      expect(totals.products.files).toBe(1);
      expect(totals.products.skus).toBe(1);
      expect(totals.menuItems.files).toBe(1);
      expect(totals.menuItems.skus).toBe(1);

      const widget = readFrontmatter(productsDir, "widget.md");
      expect(widget.options[0].sku).toBe("WIDGETS"); // preserved
      const largeSku = widget.options[1].sku;
      expect(largeSku).toMatch(SKU_PATTERN);

      const burgerSku = readFrontmatter(menuItemsDir, "burger.md").sku;
      expect(burgerSku).toMatch(SKU_PATTERN);
      // Global uniqueness: all generated SKUs differ from each other and
      // from the pre-existing product option SKU.
      expect(new Set([largeSku, burgerSku, "WIDGETS"]).size).toBe(3);

      // Ambiguous-price menu item is skipped (no sku added).
      expect(readFrontmatter(menuItemsDir, "combo.md").sku).toBeUndefined();
    }));

  test("dry-run reports without writing files", () =>
    withTempDir("add-skus-dryrun", (tempDir) => {
      const { productsDir, menuItemsDir } = makeSkuDirs(tempDir);

      writeWidget(productsDir, [{ name: "Small", unit_price: 10 }]);
      writeProduct(menuItemsDir, "burger.md", {
        name: "Beyond Burger",
        price: "£15.00",
      });

      const { totals } = addSkusToAll({
        dryRun: true,
        productsDir,
        menuItemsDir,
      });
      expect(totals.products.skus).toBe(1);
      expect(totals.menuItems.skus).toBe(1);

      // Files untouched in dry-run mode.
      expect(readFrontmatter(productsDir, "widget.md").options[0].sku).toBe(
        undefined,
      );
      expect(readFrontmatter(menuItemsDir, "burger.md").sku).toBeUndefined();
    }));
});
