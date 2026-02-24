// Products Cache
// Fetches product data from the ecommerce API and caches it in localStorage.
// Used to validate buy-mode cart items (SKU availability, stock, prices).

import { getCart, saveCart } from "#public/utils/cart-utils.js";
import Config from "#public/utils/config.js";
import { fetchJson } from "#public/utils/http.js";
import { showNotification } from "#public/utils/notify.js";
import { sendNtfyNotification } from "#public/utils/ntfy.js";

const CACHE_KEY = "products_cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const getCachedProducts = () => {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  const cache = JSON.parse(raw);
  if (Date.now() - cache.cached_at < CACHE_TTL_MS) return cache.data;
  return null;
};

/**
 * Validate buy-mode cart items against the products cache.
 * Removes items with unmatched SKUs or out-of-stock status.
 * Updates unit_price from the API data (API returns pence, cart stores pounds).
 * Returns true if the cart was modified.
 */
const validateBuyItems = (cart, products) => {
  const productBySku = Object.fromEntries(
    products.map((product) => [product.sku, product]),
  );

  const classified = cart.map((item) => {
    if (item.product_mode !== "buy") return { valid: item };
    const product = productBySku[item.sku];
    if (!product || !product.in_stock) return { removed: item.item_name };
    return { valid: { ...item, unit_price: product.unit_price / 100 } };
  });

  const validItems = classified.filter((c) => c.valid).map((c) => c.valid);
  const removedNames = classified
    .filter((c) => c.removed)
    .map((c) => c.removed);

  if (removedNames.length > 0) {
    saveCart(validItems);
    for (const name of removedNames) {
      showNotification(
        `${name} was removed from your cart because it is no longer available`,
      );
    }
    return true;
  }

  const pricesChanged = validItems.some(
    (item, i) => item.unit_price !== cart[i].unit_price,
  );
  if (pricesChanged) {
    saveCart(validItems);
    return true;
  }

  return false;
};

/**
 * Fetch products and validate buy-mode cart items.
 * Call this when a buy-mode item is added to cart, or before checkout.
 * Shows alert if the API is unreachable.
 */
const validateCartWithCache = async () => {
  const cart = getCart();
  const hasBuyItems = cart.some((item) => item.product_mode === "buy");
  if (!hasBuyItems) return;

  if (!Config.ecommerce_api_host) return;

  const cached = getCachedProducts();
  const products =
    cached ||
    (await fetchJson(`https://${Config.ecommerce_api_host}/api/products`));

  if (!products) {
    sendNtfyNotification(
      `Ecommerce API unreachable: ${Config.ecommerce_api_host}`,
    );
    showNotification(
      "Unable to reach the store to verify product availability. Please check your connection and try again.",
    );
    return;
  }

  // Update cache if we just fetched
  if (!cached) {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data: products, cached_at: Date.now() }),
    );
  }

  validateBuyItems(cart, products);
};

/**
 * Trigger an async cache refresh if there are buy-mode items in the cart.
 * Does not block - used after adding items to cart.
 * The buy-item and host checks are duplicated in validateCartWithCache,
 * but this avoids an unnecessary async call when we know it's a no-op.
 */
const refreshCacheIfNeeded = () => {
  if (!Config.ecommerce_api_host) return;
  if (!getCart().some((item) => item.product_mode === "buy")) return;
  validateCartWithCache();
};

export {
  CACHE_KEY,
  CACHE_TTL_MS,
  getCachedProducts,
  refreshCacheIfNeeded,
  validateBuyItems,
  validateCartWithCache,
};
