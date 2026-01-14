/**
 * Functional array utilities
 */

/**
 * Left-to-right function composition
 *
 * Passes a value through a sequence of functions, where each function
 * receives the result of the previous one.
 *
 * @param {...Function} fns - Functions to compose
 * @returns {Function} (value) => transformed value
 *
 * @example
 * pipe(addOne, double, toString)(5)  // "12"
 * pipe(filter(isEven), map(square), sum)(numbers)
 */
const pipe =
  (...fns) =>
  (x) =>
    fns.reduce((v, f) => f(v), x);

/**
 * Curried array helpers for use with pipe()
 *
 * @example
 * pipe(
 *   filter(x => x > 0),
 *   map(x => x * 2),
 *   sort((a, b) => a - b)
 * )(numbers)
 */
const filter = (predicate) => (arr) => arr.filter(predicate);
const map = (fn) => (arr) => arr.map(fn);
const flatMap = (fn) => (arr) => arr.flatMap(fn);
const reduce = (fn, initial) => (arr) => arr.reduce(fn, initial);
const sort = (comparator) => (arr) => [...arr].sort(comparator);
const unique = (arr) => [...new Set(arr)];
const uniqueBy = (getKey) => (arr) => [
  ...new Map(arr.map((item) => [getKey(item), item])).values(),
];
const join = (separator) => (arr) => arr.join(separator);
const split = (separator) => (str) => str.split(separator);

/**
 * Filter and map in a single pass (curried)
 *
 * Combines filter and map operations, processing each element once.
 * More expressive than chaining filter().map() when both operate
 * on the same items. Uses flatMap for a pure implementation.
 *
 * @param {Function} predicate - (item) => boolean
 * @param {Function} transform - (item) => result
 * @returns {Function} (array) => filtered and mapped array
 *
 * @example
 * // Get names of active users
 * filterMap(user => user.active, user => user.name)(users)
 *
 * @example
 * // Use with pipe
 * pipe(
 *   filterMap(n => n > 0, n => n * 2),
 *   sort((a, b) => a - b)
 * )(numbers)
 */
const filterMap = (predicate, transform) => (arr) =>
  arr.flatMap((item) => (predicate(item) ? [transform(item)] : []));

/**
 * Create a picker function for the specified keys (curried form)
 *
 * Returns a function that extracts only the specified keys from an object.
 * This curried form works perfectly with map(): arr.map(pick(['a', 'b']))
 *
 * @param {string[]} keys - Keys to include
 * @returns {(obj: Object) => Object} Function that picks specified keys from an object
 *
 * @example
 * pick(['a', 'c'])({ a: 1, b: 2, c: 3 })  // { a: 1, c: 3 }
 * users.map(pick(['name', 'age']))        // picks name & age from each
 */
const pick = (keys) => (obj) =>
  Object.fromEntries(
    filterMap(
      (k) => k in obj,
      (k) => [k, obj[k]],
    )(keys),
  );

/**
 * Remove falsy values from an array
 *
 * Filters out null, undefined, false, 0, '', and NaN.
 * Perfect for building arrays with conditional elements.
 *
 * @param {Array} arr - Array potentially containing falsy values
 * @returns {Array} Array with only truthy values
 *
 * @example
 * compact([1, null, 2, undefined, 3])        // [1, 2, 3]
 * compact(['a', false && 'b', 'c'])          // ['a', 'c']
 * compact([condition && 'value', 'always']) // conditionally includes 'value'
 */
const compact = (arr) => arr.filter(Boolean);

/**
 * Get the separator for an item in a list formatted with "and"
 *
 * Returns ", " for most items, " and " for second-to-last, "" for last.
 * Curried: call with length first, then index.
 *
 * @param {number} length - Total length of the list
 * @returns {Function} (index) => separator string
 *
 * @example
 * const sep = listSeparator(3);
 * sep(0)  // ", "
 * sep(1)  // " and "
 * sep(2)  // ""
 */
const listSeparator = (length) => (index) =>
  index >= length - 1 ? "" : index === length - 2 ? " and " : ", ";

/**
 * Find the first duplicate item in an array
 *
 * Returns the first item whose key matches a previous item's key.
 * Returns undefined if no duplicates exist.
 *
 * Uses pure functional approach with no mutable state.
 *
 * @param {Array} items - Array to check for duplicates
 * @param {(item: any) => any} [getKey] - Optional key extractor (defaults to identity)
 * @returns {*} First duplicate item, or undefined
 *
 * @example
 * findDuplicate([1, 2, 1])                              // 1
 * findDuplicate([{id: 1}, {id: 2}, {id: 1}], x => x.id) // {id: 1} (at index 2)
 * findDuplicate([1, 2, 3])                              // undefined
 */
const findDuplicate = (items, getKey = (x) => x) => {
  const keys = items.map(getKey);
  return items.find((_, i) => keys.indexOf(keys[i]) !== i);
};

/**
 * Safe array accumulation in reduce callbacks
 *
 * Use this for building arrays within reduce operations.
 * Each call gets a fresh array, providing O(1) push operations
 * instead of O(n²) complexity from repeated spread syntax.
 *
 * This enables safe imperative patterns like acc.push() within the callback.
 *
 * @param {Function} fn - (accumulator, item) => accumulator callback
 * @returns {Function} (array) => result (fresh array per call)
 *
 * @example
 * // Collect unique IDs from fields
 * const getFieldIds = accumulate((acc, field) => {
 *   const id = field.type === "radio" ? field.name : field.id;
 *   if (id && !acc.includes(id)) {
 *     acc.push(id);  // Safe: array only accessible within callback
 *   }
 *   return acc;
 * });
 *
 * getFieldIds(fields)  // Returns array
 *
 * @example
 * // Use with pipe for functional composition
 * pipe(
 *   accumulate((acc, user) => {
 *     if (user.active) acc.push(user.name);
 *     return acc;
 *   })
 * )(users)
 */
const accumulate = (fn) => (arr) => arr.reduce(fn, []);

/**
 * Create a membership predicate factory with configurable negation.
 * Curried: (negate) => (values) => (value) => boolean
 *
 * This factory unifies memberOf and notMemberOf into a single pattern.
 *
 * @param {boolean} negate - Whether to negate the membership test
 * @returns {Function} (values) => (value) => boolean
 *
 * @example
 * const memberOf = membershipPredicate(false);
 * const notMemberOf = membershipPredicate(true);
 */
const membershipPredicate = (negate) => (values) => (value) =>
  negate ? !values.includes(value) : values.includes(value);

/**
 * Create a membership predicate
 *
 * Returns a predicate function that tests if a value is in the collection.
 *
 * @param {Iterable} values - Values to check membership against
 * @returns {Function} (value) => boolean
 *
 * @example
 * const isWeekend = memberOf(['saturday', 'sunday']);
 * isWeekend('saturday')  // true
 * isWeekend('monday')    // false
 *
 * // Use with filter
 * const validCodes = memberOf(['A1', 'B2', 'C3']);
 * codes.filter(validCodes)  // only codes in the valid set
 *
 * // Use with some/every
 * items.some(memberOf(allowedItems))
 * items.every(memberOf(validValues))
 */
const memberOf = membershipPredicate(false);

/**
 * Create a negated membership predicate
 *
 * Returns a predicate function that tests if a value is NOT in the collection.
 *
 * @param {Iterable} values - Values to exclude
 * @returns {Function} (value) => boolean
 *
 * @example
 * const isNotReserved = notMemberOf(['admin', 'root', 'system']);
 * isNotReserved('user')   // true
 * isNotReserved('admin')  // false
 *
 * // Use with filter to exclude items
 * usernames.filter(notMemberOf(reservedNames))
 */
const notMemberOf = membershipPredicate(true);

/**
 * Create a pluralization formatter.
 * Curried: (singular, plural?) => (count) => string
 *
 * Returns a function that formats a count with the appropriate singular/plural form.
 * If plural is omitted, auto-derives it from singular (adds "es" if ends in "s", else "s").
 *
 * @param {string} singular - Singular form (e.g., "day", "item in order")
 * @param {string} [plural] - Plural form (optional, auto-derived if omitted)
 * @returns {Function} (count) => formatted string
 *
 * @example
 * const formatDays = pluralize("day");
 * formatDays(1)  // "1 day"
 * formatDays(5)  // "5 days"
 *
 * @example
 * const formatClasses = pluralize("class");
 * formatClasses(1)  // "1 class"
 * formatClasses(2)  // "2 classes"
 *
 * @example
 * const formatItems = pluralize("item in order", "items in order");
 * formatItems(1)  // "1 item in order"
 * formatItems(3)  // "3 items in order"
 */
const pluralize = (singular, plural) => {
  const pluralForm =
    plural ?? (singular.endsWith("s") ? `${singular}es` : `${singular}s`);
  return (count) => (count === 1 ? `1 ${singular}` : `${count} ${pluralForm}`);
};

export {
  accumulate,
  compact,
  filter,
  filterMap,
  findDuplicate,
  flatMap,
  join,
  listSeparator,
  map,
  memberOf,
  membershipPredicate,
  notMemberOf,
  pick,
  pipe,
  pluralize,
  reduce,
  sort,
  split,
  unique,
  uniqueBy,
};
