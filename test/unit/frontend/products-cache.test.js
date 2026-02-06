import { describe, expect, mock, test } from "bun:test";
import { getCart, saveCart } from "#public/utils/cart-utils.js";

// Mock dependencies at module level to avoid parallel test interference:
// - http.js: prevents globalThis.fetch race conditions with http.test.js
// - config.js: prevents DOM site-config conflicts with checkout.test.js
const mockFetchJson = mock(() => Promise.resolve(null));
mock.module("#public/utils/http.js", () => ({
  fetchJson: (...args) => mockFetchJson(...args),
}));
mock.module("#public/utils/config.js", () => ({
  default: { ecommerce_api_host: "test.example.com" },
}));

const {
  CACHE_KEY,
  CACHE_TTL_MS,
  getCachedProducts,
  refreshCacheIfNeeded,
  validateBuyItems,
  validateCartWithCache,
} = await import("#public/utils/products-cache.js");

const withCleanStorage = async (fn) => {
  localStorage.clear();
  mockFetchJson.mockReset();
  try {
    return await fn();
  } finally {
    localStorage.clear();
  }
};

const withMockedAlert = async (fn) => {
  const alertMock = mock();
  const origAlert = global.alert;
  global.alert = alertMock;
  try {
    return await fn(alertMock);
  } finally {
    global.alert = origAlert;
  }
};

const expectSingleRemovalAlert = (alertMock, expectedName) => {
  expect(getCart()).toHaveLength(0);
  expect(alertMock).toHaveBeenCalledTimes(1);
  expect(alertMock.mock.calls[0][0]).toContain(expectedName);
};

const MOCK_PRODUCTS = [
  { sku: "MH6D2J", name: "Mini Gizmo", unit_price: 30, in_stock: true },
  { sku: "WEBDEV", name: "Web Dev", unit_price: 10000, in_stock: true },
  { sku: "GONE", name: "Discontinued", unit_price: 500, in_stock: false },
];

describe("products-cache", () => {
  // ----------------------------------------
  // Cache Reading Tests
  // ----------------------------------------
  test("getCachedProducts returns null when no cache exists", () => {
    withCleanStorage(() => {
      expect(getCachedProducts()).toBeNull();
    });
  });

  test("getCachedProducts returns data when cache is fresh", () => {
    withCleanStorage(() => {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: MOCK_PRODUCTS, cached_at: Date.now() }),
      );
      expect(getCachedProducts()).toEqual(MOCK_PRODUCTS);
    });
  });

  test("getCachedProducts returns null when cache is expired", () => {
    withCleanStorage(() => {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data: MOCK_PRODUCTS,
          cached_at: Date.now() - CACHE_TTL_MS - 1000,
        }),
      );
      expect(getCachedProducts()).toBeNull();
    });
  });

  // ----------------------------------------
  // validateBuyItems Tests
  // ----------------------------------------
  test("validateBuyItems keeps non-buy items unchanged", () => {
    withCleanStorage(() => {
      const cart = [
        {
          item_name: "Hire Item",
          unit_price: 30,
          quantity: 1,
          sku: "HIRE1",
          product_mode: "hire",
        },
      ];
      saveCart(cart);
      expect(validateBuyItems(cart, MOCK_PRODUCTS)).toBe(false);
      expect(getCart()).toEqual(cart);
    });
  });

  test("validateBuyItems removes unavailable items (unmatched SKU and out-of-stock)", () => {
    const cases = [
      { item_name: "Unknown Product", unit_price: 10, sku: "DOESNT_EXIST" },
      { item_name: "Discontinued", unit_price: 5, sku: "GONE" },
    ];

    for (const { item_name, unit_price, sku } of cases) {
      withCleanStorage(() =>
        withMockedAlert((alertMock) => {
          saveCart([
            { item_name, unit_price, quantity: 1, sku, product_mode: "buy" },
          ]);
          expect(validateBuyItems(getCart(), MOCK_PRODUCTS)).toBe(true);
          expectSingleRemovalAlert(alertMock, item_name);
          expect(alertMock.mock.calls[0][0]).toContain("no longer available");
        }),
      );
    }
  });

  test("validateBuyItems updates unit_price from API (pence to pounds)", () => {
    withCleanStorage(() => {
      const cart = [
        {
          item_name: "Mini Gizmo",
          unit_price: 0.5,
          quantity: 1,
          sku: "MH6D2J",
          product_mode: "buy",
        },
      ];
      saveCart(cart);
      // Price changed from 0.5 to 0.30 (30 pence / 100)
      expect(validateBuyItems(cart, MOCK_PRODUCTS)).toBe(true);
      expect(getCart()[0].unit_price).toBe(0.3);
    });
  });

  test("validateBuyItems does not modify cart when prices match", () => {
    withCleanStorage(() => {
      const cart = [
        {
          item_name: "Mini Gizmo",
          unit_price: 0.3,
          quantity: 2,
          sku: "MH6D2J",
          product_mode: "buy",
        },
      ];
      saveCart(cart);
      expect(validateBuyItems(cart, MOCK_PRODUCTS)).toBe(false);
    });
  });

  test("validateBuyItems handles mixed buy and non-buy items", () => {
    withCleanStorage(() =>
      withMockedAlert((alertMock) => {
        const cart = [
          {
            item_name: "Hire Item",
            unit_price: 30,
            quantity: 1,
            sku: "HIRE1",
            product_mode: "hire",
          },
          {
            item_name: "Valid Buy",
            unit_price: 100,
            quantity: 1,
            sku: "WEBDEV",
            product_mode: "buy",
          },
          {
            item_name: "Invalid Buy",
            unit_price: 10,
            quantity: 1,
            sku: "NOPE",
            product_mode: "buy",
          },
        ];
        saveCart(cart);

        expect(validateBuyItems(cart, MOCK_PRODUCTS)).toBe(true);

        const updatedCart = getCart();
        expect(updatedCart).toHaveLength(2);
        expect(updatedCart[0].item_name).toBe("Hire Item");
        expect(updatedCart[1].item_name).toBe("Valid Buy");
        expect(updatedCart[1].unit_price).toBe(100);

        expect(alertMock).toHaveBeenCalledTimes(1);
        expect(alertMock.mock.calls[0][0]).toContain("Invalid Buy");
      }),
    );
  });

  test("validateBuyItems alerts for each removed item individually", () => {
    withCleanStorage(() =>
      withMockedAlert((alertMock) => {
        const cart = [
          {
            item_name: "Gone Item A",
            unit_price: 5,
            quantity: 1,
            sku: "GONE",
            product_mode: "buy",
          },
          {
            item_name: "Gone Item B",
            unit_price: 10,
            quantity: 1,
            sku: "UNKNOWN",
            product_mode: "buy",
          },
        ];
        saveCart(cart);

        validateBuyItems(cart, MOCK_PRODUCTS);

        expect(alertMock).toHaveBeenCalledTimes(2);
        expect(alertMock.mock.calls[0][0]).toContain("Gone Item A");
        expect(alertMock.mock.calls[1][0]).toContain("Gone Item B");
      }),
    );
  });

  // ----------------------------------------
  // Cache Constants Tests
  // ----------------------------------------
  test("CACHE_TTL_MS is 1 hour", () => {
    expect(CACHE_TTL_MS).toBe(60 * 60 * 1000);
  });

  test("CACHE_KEY is products_cache", () => {
    expect(CACHE_KEY).toBe("products_cache");
  });

  // ----------------------------------------
  // validateCartWithCache Tests
  // ----------------------------------------
  test("validateCartWithCache skips fetch if no buy-mode items", async () => {
    await withCleanStorage(async () => {
      saveCart([
        {
          item_name: "Hire",
          unit_price: 10,
          quantity: 1,
          product_mode: "hire",
        },
      ]);
      await validateCartWithCache();
      expect(mockFetchJson).not.toHaveBeenCalled();
    });
  });

  test("validateCartWithCache fetches products and validates cart", async () => {
    await withCleanStorage(async () => {
      mockFetchJson.mockImplementation(() => Promise.resolve(MOCK_PRODUCTS));
      await withMockedAlert(async () => {
        saveCart([
          {
            item_name: "Mini Gizmo",
            unit_price: 0.5,
            quantity: 1,
            sku: "MH6D2J",
            product_mode: "buy",
          },
        ]);
        await validateCartWithCache();
        expect(mockFetchJson).toHaveBeenCalledTimes(1);
        expect(getCart()[0].unit_price).toBe(0.3);
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY));
        expect(cache.data).toEqual(MOCK_PRODUCTS);
      });
    });
  });

  test("validateCartWithCache uses cached products when fresh", async () => {
    await withCleanStorage(async () => {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: MOCK_PRODUCTS, cached_at: Date.now() }),
      );
      saveCart([
        {
          item_name: "Mini Gizmo",
          unit_price: 0.3,
          quantity: 1,
          sku: "MH6D2J",
          product_mode: "buy",
        },
      ]);
      await validateCartWithCache();
      expect(mockFetchJson).not.toHaveBeenCalled();
    });
  });

  test("validateCartWithCache alerts when API is unreachable", async () => {
    await withCleanStorage(async () => {
      mockFetchJson.mockImplementation(() => Promise.resolve(null));
      await withMockedAlert(async (alertMock) => {
        saveCart([
          {
            item_name: "Gizmo",
            unit_price: 0.3,
            quantity: 1,
            sku: "MH6D2J",
            product_mode: "buy",
          },
        ]);
        await validateCartWithCache();
        expect(alertMock).toHaveBeenCalledTimes(1);
        expect(alertMock.mock.calls[0][0]).toContain(
          "Unable to reach the store",
        );
      });
    });
  });

  test("validateCartWithCache removes unavailable items after fetch", async () => {
    await withCleanStorage(async () => {
      mockFetchJson.mockImplementation(() => Promise.resolve(MOCK_PRODUCTS));
      await withMockedAlert(async (alertMock) => {
        saveCart([
          {
            item_name: "Unknown",
            unit_price: 10,
            quantity: 1,
            sku: "NOPE",
            product_mode: "buy",
          },
        ]);
        await validateCartWithCache();
        expectSingleRemovalAlert(alertMock, "Unknown");
      });
    });
  });

  // ----------------------------------------
  // refreshCacheIfNeeded Tests
  // ----------------------------------------
  test("refreshCacheIfNeeded does nothing with empty cart", () => {
    withCleanStorage(() => {
      saveCart([]);
      refreshCacheIfNeeded();
      expect(mockFetchJson).not.toHaveBeenCalled();
    });
  });

  test("refreshCacheIfNeeded does nothing with only hire items", () => {
    withCleanStorage(() => {
      saveCart([
        {
          item_name: "Hire",
          unit_price: 10,
          quantity: 1,
          product_mode: "hire",
        },
      ]);
      refreshCacheIfNeeded();
      expect(mockFetchJson).not.toHaveBeenCalled();
    });
  });

  test("refreshCacheIfNeeded triggers fetch for buy items", () => {
    withCleanStorage(() => {
      mockFetchJson.mockImplementation(() => Promise.resolve(MOCK_PRODUCTS));
      withMockedAlert(() => {
        saveCart([
          {
            item_name: "Gizmo",
            unit_price: 0.3,
            quantity: 1,
            sku: "MH6D2J",
            product_mode: "buy",
          },
        ]);
        refreshCacheIfNeeded();
        expect(mockFetchJson).toHaveBeenCalledTimes(1);
      });
    });
  });
});
