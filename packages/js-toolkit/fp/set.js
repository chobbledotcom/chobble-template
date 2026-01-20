/**
 * Frozen set utilities for immutable membership lookups
 *
 * Frozen sets provide O(1) membership checks and signal immutability intent.
 * Use for constants that define valid values, blocklists, etc.
 *
 * Note: Object.freeze() prevents property additions but doesn't prevent
 * Set internal mutations in all JS engines. The freeze primarily serves
 * to signal intent and works with TypeScript's ReadonlySet type.
 */

/**
 * Create a frozen Set from values
 *
 * Returns a frozen Set for use as an immutable constant. The freeze
 * signals that this set shouldn't be modified and enables ReadonlySet typing.
 *
 * @template T
 * @param {T[]} values - Values to include in the set
 * @returns {ReadonlySet<T>} Frozen set
 *
 * @example
 * const VALID_TYPES = frozenSet(['image', 'video', 'audio']);
 * VALID_TYPES.has('image')  // true
 * VALID_TYPES.has('text')   // false
 */
const frozenSet = (values) => Object.freeze(new Set(values));

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
const frozenSetFrom = (iterable) => Object.freeze(new Set(iterable));

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
