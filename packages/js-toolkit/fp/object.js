/**
 * Curried utilities for cleaner object iteration
 *
 * All callbacks receive (key, value) as separate arguments, not a tuple.
 *
 * Instead of: Object.entries(obj).map(([k, v]) => transform(k, v))
 * Write:      mapEntries((k, v) => transform(k, v))(obj)
 */

/**
 * Curried map over entries -> returns array
 * @template V
 * @template R
 * @param {(key: string, value: V) => R} fn - Transform function
 * @returns {(obj: Record<string, V>) => R[]} Function that maps entries
 * @example
 * mapEntries((k, v) => `${k}=${v}`)({ a: 1 }) // ['a=1']
 */
const mapEntries = (fn) => (obj) =>
  Object.entries(obj).map(([k, v]) => fn(k, v));

/**
 * Curried object transformation -> returns new object
 * Callback must return [newKey, newValue] tuple
 * @template V
 * @template K2 extends string
 * @template V2
 * @param {(key: string, value: V) => [K2, V2]} fn - Transform function
 * @returns {(obj: Record<string, V>) => Record<K2, V2>} Function that transforms object
 * @example
 * mapObject((k, v) => [k.toUpperCase(), v * 2])({ a: 1 }) // { A: 2 }
 */
const mapObject = (fn) => (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => fn(k, v)));

/**
 * Curried object filtering -> returns new object
 * @template V
 * @param {(key: string, value: V) => boolean} predicate - Filter predicate
 * @returns {(obj: Record<string, V>) => Record<string, V>} Function that filters object
 * @example
 * filterObject((k, v) => v > 0)({ a: 1, b: -1 }) // { a: 1 }
 */
const filterObject = (predicate) => (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([k, v]) => predicate(k, v)));

// Common pre-built utilities

/**
 * Transform both key and value with the same function
 * @param {(s: string) => string} fn - Transform function
 * @returns {(obj: Record<string, string>) => Record<string, string>} Function that transforms both keys and values
 * @example
 * mapBoth(s => s.toLowerCase())({ FOO: 'BAR' }) // { foo: 'bar' }
 */
const mapBoth = (fn) => mapObject((k, v) => [fn(k), fn(v)]);

/**
 * Keep only entries with truthy values
 * @template V
 * @param {Record<string, V | null | undefined | false | 0 | ''>} obj - Object with potentially falsy values
 * @returns {Record<string, NonNullable<V>>} Object with only truthy values
 * @example
 * pickTruthy({ a: 1, b: null, c: '' }) // { a: 1 }
 */
const pickTruthy = filterObject((_k, v) => v);

/**
 * Keep only entries with non-null values (keeps false, 0, '', etc.)
 * Useful for config merging where null means "use default"
 * @template V
 * @param {Record<string, V | null>} obj - Object with potentially null values
 * @returns {Record<string, V>} Object without null values
 * @example
 * pickNonNull({ a: 1, b: null, c: false }) // { a: 1, c: false }
 */
const pickNonNull = filterObject((_k, v) => v !== null);

/**
 * Build an object from an array by extracting key-value pairs
 *
 * Each item is transformed to a [key, value] entry via the toEntry function.
 * This is a functional alternative to building objects with for-loops and mutation.
 *
 * @template T
 * @template V
 * @param {T[]} items - Array of items to transform
 * @param {(item: T, index: number) => [string | number, V]} toEntry - Function that returns [key, value] for each item (numbers coerced to strings)
 * @returns {Record<string, V>} Object built from the entries
 *
 * @example
 * // Build filename -> alt text lookup
 * toObject(images, img => [img.path.split('/').pop(), img.alt])
 * // { 'photo.jpg': 'A photo', 'logo.png': 'Company logo' }
 *
 * @example
 * // Build id -> item index
 * toObject(items, (item, i) => [item.id, i])
 * // { 'abc': 0, 'def': 1, 'ghi': 2 }
 */
const toObject = (items, toEntry) => Object.fromEntries(items.map(toEntry));

/**
 * Build an object directly from an array of [key, value] pairs
 *
 * This is a thin wrapper around Object.fromEntries for consistency
 * and readability when composing with other functional utilities.
 *
 * Note: Later entries overwrite earlier ones with the same key (last wins).
 * For first-occurrence-wins, reverse the array first.
 *
 * @template V
 * @param {[string, V][]} pairs - Array of [key, value] pairs
 * @returns {Record<string, V>} Object built from the pairs
 *
 * @example
 * fromPairs([['a', 1], ['b', 2]])  // { a: 1, b: 2 }
 *
 * @example
 * // First-occurrence-wins (reverse to get first as last)
 * fromPairs([['a', 1], ['a', 2]].reverse())  // { a: 1 }
 */
const fromPairs = (pairs) => Object.fromEntries(pairs);

/**
 * Create a curried function that omits specified keys from an object.
 * @param {string[]} keys - Keys to omit
 * @returns {(obj: Record<string, any>) => Record<string, any>} Function that omits specified keys
 */
const omit = (keys) => (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

/**
 * Create a frozen (deeply immutable) object from key-value pairs
 *
 * Returns an object wrapped in a Proxy that throws TypeError on mutation
 * attempts (property assignment, deletion, definition). All read operations
 * work normally. Unlike Object.freeze, provides clear error messages.
 *
 * @template {Record<string, unknown>} T
 * @param {T} obj - Object to freeze
 * @returns {Readonly<T>} Frozen object
 *
 * @example
 * const CONFIG = frozenObject({ maxRetries: 3, timeout: 5000 });
 * CONFIG.maxRetries       // 3
 * CONFIG.timeout = 1000   // throws TypeError
 * delete CONFIG.maxRetries // throws TypeError
 */
const frozenObject = (obj) => {
  return /** @type {Readonly<T>} */ (
    new Proxy(obj, {
      set(_, prop) {
        throw new TypeError(
          `Cannot set property '${String(prop)}' on a frozen object`,
        );
      },
      deleteProperty(_, prop) {
        throw new TypeError(
          `Cannot delete property '${String(prop)}' from a frozen object`,
        );
      },
      defineProperty(_, prop) {
        throw new TypeError(
          `Cannot define property '${String(prop)}' on a frozen object`,
        );
      },
    })
  );
};

export {
  filterObject,
  mapEntries,
  mapObject,
  mapBoth,
  pickTruthy,
  pickNonNull,
  toObject,
  fromPairs,
  omit,
  frozenObject,
};
