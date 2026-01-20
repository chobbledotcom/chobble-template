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

const MUTATION_METHODS = new Set(["add", "delete", "clear"]);

/**
 * Create proxy handler that blocks mutation methods
 * @param {string} methodName - Name of the blocked method
 * @returns {() => never} Function that throws TypeError
 */
const blockedMethod = (methodName) => () => {
  throw new TypeError(`Cannot call ${methodName}() on a frozen set`);
};

/**
 * Proxy handler for frozen sets
 * @type {ProxyHandler<Set<unknown>>}
 */
const frozenSetHandler = {
  get(target, prop) {
    if (MUTATION_METHODS.has(prop)) {
      return blockedMethod(prop);
    }
    const value = target[prop];
    // Bind methods to the target so they work correctly
    return typeof value === "function" ? value.bind(target) : value;
  },
};

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
const frozenSet = (values) => new Proxy(new Set(values), frozenSetHandler);

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
const frozenSetFrom = (iterable) =>
  new Proxy(new Set(iterable), frozenSetHandler);

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
