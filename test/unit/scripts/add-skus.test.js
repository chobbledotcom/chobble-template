import { describe, expect, spyOn, test } from "bun:test";
import matter from "gray-matter";
import {
  addSkusToAll,
  extractSkuFromMenuItem,
  extractSkusFromProduct,
  generateUniqueSku,
  isBuyableMenuItem,
  logResults,
  processMenuItemFile,
  processProductFile,
  runCli,
} from "#bin/add-skus";
import {
  captureConsole,
  createFrontmatter,
  fs,
  path,
  withMockedCwd,
  withTempDir,
} from "#test/test-utils.js";

const SKU_PATTERN = /^[A-Z0-9]{6}$/;

const writeProduct = (dir, file, frontmatter) => {
  fs.writeFileSync(path.join(dir, file), createFrontmatter(frontmatter, ""));
};

const readFrontmatter = (dir, file) =>
  matter(fs.readFileSync(path.join(dir, file), "utf-8")).data;

const menuItemInput = (data) => ({ data, body: "", filePath: "/x.md" });

const productInput = (data) => ({ data, body: "", filePath: "/x.md" });

const makeSkuDirs = (tempDir) => {
  const productsDir = path.join(tempDir, "products");
  const menuItemsDir = path.join(tempDir, "menu-items");
  fs.mkdirSync(productsDir, { recursive: true });
  fs.mkdirSync(menuItemsDir, { recursive: true });
  return { productsDir, menuItemsDir };
};

const writeWidget = (productsDir, options) =>
  writeProduct(productsDir, "widget.md", { name: "Widget", options });

// Universal factory: compose an input shaper + process function + result
// assertion into a single checker. Plugging in different assertions
// (assertUnchanged, assertOneSkuAdded, …) reuses the same plumbing for
// every "process then inspect" test helper.
const expectProcessed =
  (processFile, toInput, assert) =>
  (data, existingSkus = new Set()) => {
    const result = processFile(toInput(data), existingSkus);
    assert(result);
    return result;
  };

const assertUnchanged = (result) => {
  expect(result.modified).toBe(false);
  expect(result.skusAdded).toBe(0);
};

const assertOneSkuAdded = (result, preservedSku) => {
  expect(result.modified).toBe(true);
  expect(result.skusAdded).toBe(1);
  expect(result.updatedSkus.has(preservedSku)).toBe(true);
  return result;
};

const expectMenuItemUnchanged = expectProcessed(
  processMenuItemFile,
  menuItemInput,
  assertUnchanged,
);
const expectProductUnchanged = expectProcessed(
  processProductFile,
  productInput,
  assertUnchanged,
);

describe("isBuyableMenuItem", () => {
  test("buyable when price is a single parseable amount", () => {
    expect(isBuyableMenuItem({ price: "£15.00" })).toBe(true);
    expect(isBuyableMenuItem({ price: 8 })).toBe(true);
  });

  test("not buyable when price is ambiguous, missing, or unparseable", () => {
    expect(isBuyableMenuItem({ price: "£10 / £12" })).toBe(false);
    expect(isBuyableMenuItem({ price: undefined })).toBe(false);
    expect(isBuyableMenuItem({ price: "Market price" })).toBe(false);
    expect(isBuyableMenuItem({ price: "P.O.A." })).toBe(false);
  });
});

describe("extractSkusFromProduct", () => {
  test("returns option-level skus", () => {
    expect(
      extractSkusFromProduct({
        data: {
          options: [{ sku: "ABC123" }, { name: "Missing" }, { sku: "DEF456" }],
        },
      }),
    ).toEqual(["ABC123", "DEF456"]);
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
    assertOneSkuAdded(result, "TAKEN");

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

describe("generateUniqueSku", () => {
  test("throws when the attempt budget is exhausted before finding a unique SKU", () => {
    // maxAttempts of 0 means the guard fires on the first call without ever
    // generating a candidate, exercising the exhaustion branch deterministically.
    expect(() => generateUniqueSku(new Set(), 0)).toThrow(
      "Could not generate unique SKU after maximum attempts",
    );
  });
});

describe("processProductFile", () => {
  test("leaves a product unchanged when it has no options field", () => {
    const result = expectProductUnchanged(
      { name: "NoOptions" },
      new Set(["KEEP"]),
    );
    expect(result.newContent).toBeNull();
    // The early return threads the input SKU set through unchanged, so the
    // existing SKU is still present on the returned set.
    expect(result.updatedSkus.has("KEEP")).toBe(true);
  });

  test("leaves a product unchanged when options is not an array", () => {
    const result = expectProductUnchanged({
      name: "BadOptions",
      options: "nope",
    });
    expect(result.newContent).toBeNull();
  });

  test("adds SKUs to options that are missing them", () => {
    const result = processProductFile(
      productInput({
        name: "Widget",
        options: [
          { name: "Small", unit_price: 10, sku: "WIDGETS" },
          { name: "Large", unit_price: 15 },
        ],
      }),
      new Set(["WIDGETS"]),
    );
    assertOneSkuAdded(result, "WIDGETS");

    const { options } = matter(result.newContent).data;
    expect(options[0].sku).toBe("WIDGETS");
    expect(options[1].sku).toMatch(SKU_PATTERN);
  });
});

describe("addSkusToAll missing collection dirs", () => {
  test("logs an error and exits when neither collection directory exists", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {
      // suppress: logError output is not under test here
    });
    const exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    try {
      expect(() =>
        addSkusToAll({
          productsDir: "/nonexistent/add-skus/products",
          menuItemsDir: "/nonexistent/add-skus/menu-items",
        }),
      ).toThrow("process.exit called");
      expect(
        errorSpy.mock.calls.some((args) =>
          args.join(" ").includes("No SKU collections found"),
        ),
      ).toBe(true);
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  test("supports menu-only sites without a products directory", () =>
    withTempDir("add-skus-menu-only", (tempDir) => {
      const productsDir = path.join(tempDir, "missing-products");
      const menuItemsDir = path.join(tempDir, "menu-items");
      fs.mkdirSync(menuItemsDir, { recursive: true });
      writeProduct(menuItemsDir, "burger.md", {
        name: "Burger",
        price: "£15.00",
      });

      const { totals } = addSkusToAll({ productsDir, menuItemsDir });

      expect(totals.products.files).toBe(0);
      expect(totals.menuItems.files).toBe(1);
      expect(readFrontmatter(menuItemsDir, "burger.md").sku).toMatch(
        SKU_PATTERN,
      );
    }));

  test("supports product-only sites without a menu-items directory", () =>
    withTempDir("add-skus-product-only", (tempDir) => {
      const productsDir = path.join(tempDir, "products");
      const menuItemsDir = path.join(tempDir, "missing-menu-items");
      fs.mkdirSync(productsDir, { recursive: true });
      writeWidget(productsDir, [{ name: "Small", unit_price: 10 }]);

      const { totals } = addSkusToAll({ productsDir, menuItemsDir });

      expect(totals.products.files).toBe(1);
      expect(totals.menuItems.files).toBe(0);
      expect(readFrontmatter(productsDir, "widget.md").options[0].sku).toMatch(
        SKU_PATTERN,
      );
    }));
});

const resultsFixture = () => ({
  productResults: [
    {
      modified: true,
      skusAdded: 2,
      filePath: "/tmp/widget.md",
      newContent: "---\n---",
      updatedSkus: new Set(["AAA111"]),
    },
    {
      modified: false,
      skusAdded: 0,
      filePath: "/tmp/untouched.md",
      newContent: null,
      updatedSkus: new Set(),
    },
  ],
  menuItemResults: [
    {
      modified: true,
      skusAdded: 1,
      filePath: "/tmp/burger.md",
      newContent: "---\n---",
      updatedSkus: new Set(["BBB222"]),
    },
    {
      modified: false,
      skusAdded: 0,
      filePath: "/tmp/combo.md",
      newContent: null,
      updatedSkus: new Set(),
    },
  ],
  totals: { products: { files: 1, skus: 2 }, menuItems: { files: 1, skus: 1 } },
});

describe("logResults", () => {
  test("logs modified files and totals in write mode, returning totals", () => {
    const fixture = resultsFixture();
    const logs = captureConsole(() => {
      const returned = logResults(fixture, false);
      expect(returned).toBe(fixture.totals);
    });
    expect(
      logs.some((l) =>
        l.includes("Updated widget.md: added 2 product option SKU(s)"),
      ),
    ).toBe(true);
    expect(
      logs.some((l) => l.includes("Updated burger.md: added menu item SKU")),
    ).toBe(true);
    expect(
      logs.some((l) =>
        l.includes("Modified 1 product file(s), added 2 option SKU(s)"),
      ),
    ).toBe(true);
    expect(
      logs.some((l) =>
        l.includes("Modified 1 menu item file(s), added 1 SKU(s)"),
      ),
    ).toBe(true);
  });

  test("uses dry-run prefixes in dry-run mode", () => {
    const logs = captureConsole(() => logResults(resultsFixture(), true));
    expect(
      logs.some((l) => l.includes("[DRY RUN] Would update widget.md")),
    ).toBe(true);
    expect(
      logs.some((l) => l.includes("[DRY RUN] Would update burger.md")),
    ).toBe(true);
    expect(
      logs.some((l) => l.includes("[DRY RUN] Would modify 1 product file(s)")),
    ).toBe(true);
  });
});

describe("runCli", () => {
  test("logs a dry-run banner and summary without writing files", () =>
    withTempDir("add-skus-cli-dry", (tempDir) => {
      fs.mkdirSync(path.join(tempDir, "src/products"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, "src/menu-items"), { recursive: true });

      const logs = withMockedCwd(tempDir, () =>
        captureConsole(() => runCli(["--dry-run"])),
      );

      expect(logs.some((l) => l.includes("Running in dry-run mode"))).toBe(
        true,
      );
      expect(logs.some((l) => l.includes("[DRY RUN] Would modify"))).toBe(true);
    }));

  test("writes SKUs and logs results in normal mode", () =>
    withTempDir("add-skus-cli-write", (tempDir) => {
      const productsDir = path.join(tempDir, "src/products");
      const menuItemsDir = path.join(tempDir, "src/menu-items");
      fs.mkdirSync(productsDir, { recursive: true });
      fs.mkdirSync(menuItemsDir, { recursive: true });
      writeWidget(productsDir, [{ name: "Small", unit_price: 10 }]);
      writeProduct(menuItemsDir, "burger.md", {
        name: "Burger",
        price: "£15.00",
      });

      const logs = withMockedCwd(tempDir, () =>
        captureConsole(() => runCli([])),
      );

      expect(logs.some((l) => l.includes("Updated widget.md"))).toBe(true);
      expect(logs.some((l) => l.includes("Updated burger.md"))).toBe(true);
      expect(readFrontmatter(productsDir, "widget.md").options[0].sku).toMatch(
        SKU_PATTERN,
      );
      expect(readFrontmatter(menuItemsDir, "burger.md").sku).toMatch(
        SKU_PATTERN,
      );
    }));
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
