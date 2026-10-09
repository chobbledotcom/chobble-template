/**
 * Frozen set utilities for immutable membership lookups
 *
 * Frozen sets provide O(1) membership checks with true immutability.
 * Use for constants that define valid values, blocklists, etc.
 *
 * Uses a Proxy to intercept mutation methods and throw TypeErrors,
 * while delegating all read operations to the underlying Set.
 * Passes `instanceof Set` checks.
 */

// Use Object.freeze here (not frozenSet) to avoid circular dependency
const MUTATION_METHODS = Object.freeze(new Set(["add", "delete", "clear"]));

/**
 * Create proxy handler that blocks mutation methods
 * @param {string} methodName - Name of the blocked method
 * @returns {() => never} Function that throws TypeError
 */
const blockedMethod = (methodName) => () => {
  throw new TypeError(`Cannot call ${methodName}() on a frozen set`);
};

/**
 * Create a new method cache map.
 * @returns {Map<string | symbol, unknown>}
 */
const createMethodCache = () => new Map();

/**
 * Get a Set property by key.
 * @template T
 * @param {Set<T>} target
 * @param {string | symbol} prop
 * @returns {unknown}
 */
const getSetProperty = (target, prop) =>
  /** @type {Record<string | symbol, unknown>} */ (
    /** @type {unknown} */ (target)
  )[prop];
/**
 * Create a forEach wrapper that hands callbacks the frozen proxy.
 *
 * Set.prototype.forEach passes the underlying Set to its callback as the
 * third argument. Bound straight to the target, that would expose the raw,
 * mutable Set and bypass the mutation blocks. The wrapper re-invokes the
 * callback with the frozen proxy in that position instead.
 *
 * @template T
 * @param {Set<T>} target - The underlying Set
 * @param {ReadonlySet<T>} proxy - The frozen proxy (the get trap's receiver)
 * @returns {(callback: (value: T, valueAgain: T, set: ReadonlySet<T>) => void, thisArg?: unknown) => void} Wrapped forEach
 */
const createForEachWrapper = (target, proxy) => (callback, thisArg) =>
  target.forEach((value, valueAgain) => {
    callback.call(thisArg, value, valueAgain, proxy);
  });

/**
 * Create a proxy handler with cached bound methods for performance
 * @template T
 * @param {Set<T>} target - The underlying Set
 * @returns {ProxyHandler<Set<T>>} Proxy handler with method caching
 */
const createFrozenSetHandler = (target) => {
  const methodCache = createMethodCache();

  /**
   * Bind a method to the target (or wrap forEach) and cache it.
   * @param {string | symbol} prop - The accessed property
   * @param {Function} value - The raw Set method
   * @param {any} receiver - The object the property was accessed on (the
   *   frozen proxy for direct access), handed to forEach callbacks
   * @returns {Function} The bound or wrapped method
   */
  const bindMethod = (prop, value, receiver) => {
    const bound =
      prop === "forEach"
        ? createForEachWrapper(target, receiver)
        : value.bind(target);
    methodCache.set(prop, bound);
    return bound;
  };

  return {
    get(_, prop, receiver) {
      // Only block string method names (not symbols like Symbol.iterator)
      if (typeof prop === "string" && MUTATION_METHODS.has(prop)) {
        return blockedMethod(prop);
      }

      // Check cache first
      const cached = methodCache.get(prop);
      if (cached !== undefined) {
        return cached;
      }

      const value = getSetProperty(target, prop);
      return typeof value === "function"
        ? bindMethod(prop, value, receiver)
        : value;
    },
  };
};

/**
 * Create a frozen proxy wrapping a Set.
 * @template T
 * @param {Set<T>} set
 * @returns {ReadonlySet<T>}
 */
const createFrozenSetProxy = (set) =>
  new Proxy(set, createFrozenSetHandler(set));
/**
 * Create a frozen Set from any iterable
 *
 * Useful for creating frozen sets from generators, Maps, other Sets, etc.
 *
 * @template T
 * @param {Iterable<T>} iterable - Any iterable to create set from
 * @returns {ReadonlySet<T>} Frozen set
 *
 * @example
 * frozenSetFrom(map.keys())
 * frozenSetFrom(existingSet)
 * frozenSetFrom(generator())
 */
const frozenSetFrom = (iterable) => createFrozenSetProxy(new Set(iterable));

/**
 * Create a frozen (immutable) Set from values
 *
 * Returns a Set wrapped in a Proxy that throws TypeError on mutation
 * attempts (add, delete, clear). All read operations work normally.
 * Passes `instanceof Set` checks.
 *
 * @template T
 * @param {T[]} values - Values to include in the set
 * @returns {ReadonlySet<T>} Frozen set
 *
 * @example
 * const VALID_TYPES = frozenSet(['image', 'video', 'audio']);
 * VALID_TYPES.has('image')  // true
 * VALID_TYPES.has('text')   // false
 * VALID_TYPES.add('text')   // throws TypeError
 * VALID_TYPES instanceof Set  // true
 */
const frozenSet = (values) => frozenSetFrom(values);

/**
 * Create a negated membership predicate using a Set for O(1) lookups
 *
 * @template T
 * @param {Set<T> | ReadonlySet<T>} set - Set to check membership against
 * @returns {(value: T) => boolean} Negated membership predicate function
 *
 * @example
 * const BLOCKED = frozenSet(['admin', 'root', 'system']);
 * const isNotBlocked = setLacks(BLOCKED);
 *
 * usernames.filter(isNotBlocked)
 */
const setLacks = (set) => (value) => !set.has(value);

export { frozenSet, frozenSetFrom, setLacks };
