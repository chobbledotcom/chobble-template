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
 * Create a proxy handler with cached bound methods for performance
 * @template T
 * @param {Set<T>} target - The underlying Set
 * @returns {ProxyHandler<Set<T>>} Proxy handler with method caching
 */
const createFrozenSetHandler = (target) => {
  const methodCache = createMethodCache();

  return {
    get(_, prop) {
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
      if (typeof value === "function") {
        const bound = value.bind(target);
        methodCache.set(prop, bound);
        return bound;
      }
      return value;
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
 * Create a membership predicate using a Set for O(1) lookups
 *
 * More efficient than memberOf() when checking membership repeatedly,
 * as it uses Set.has() instead of Array.includes().
 *
 * @template T
 * @param {Set<T> | ReadonlySet<T>} set - Set to check membership against
 * @returns {(value: T) => boolean} Membership predicate function
 *
 * @example
 * const ALLOWED = frozenSet(['read', 'write', 'delete']);
 * const isAllowed = setHas(ALLOWED);
 *
 * permissions.filter(isAllowed)
 * userAction.every(isAllowed)
 */
const setHas = (set) => (value) => set.has(value);

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

export { frozenSet, frozenSetFrom, setHas, setLacks };
