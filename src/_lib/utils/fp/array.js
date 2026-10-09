/**
 * Functional array utilities
 */
import { compareBy } from "#utils/fp/sorting.js";

/**
 * @template T
 * @template R
 * @typedef {(value: T) => R} UnaryFunction
 */

/**
 * @template T, U
 * @typedef {(a: T, b: T) => U} BinaryFunction
 */

/**
 * Left-to-right function composition
 *
 * Passes a value through a sequence of functions, where each function
 * receives the result of the previous one.
 *
 * @param {...UnaryFunction<any, any>} fns - Functions to compose
 * @returns {UnaryFunction<any, any>} (value) => transformed value
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

/**
 * Curried filter function
 * @template T
 * @param {(item: T, index: number, array: T[]) => boolean} predicate - Filter predicate
 * @returns {(arr: T[]) => T[]} Function that filters array
 */
const filter = (predicate) => (arr) => arr.filter(predicate);

/**
 * Curried map function
 * @template T, R
 * @param {(item: T, index: number, array: T[]) => R} fn - Transform function
 * @returns {(arr: T[]) => R[]} Function that maps array
 */
const map = (fn) => (arr) => arr.map(fn);

/**
 * Curried flatMap function
 * @template T, R
 * @param {(item: T, index: number, array: T[]) => R | R[]} fn - Transform function
 * @returns {(arr: T[]) => R[]} Function that flat-maps array
 */
const flatMap = (fn) => (arr) => arr.flatMap(fn);

/**
 * Curried reduce function
 * @template T, R
 * @param {(acc: R, item: T, index: number, array: T[]) => R} fn - Reducer function
 * @param {R} initial - Initial value
 * @returns {(arr: T[]) => R} Function that reduces array
 */
const reduce = (fn, initial) => (arr) => arr.reduce(fn, initial);

/**
 * Non-mutating sort function
 * @template T
 * @param {(a: T, b: T) => number} comparator - Comparison function
 * @returns {(arr: T[]) => T[]} Function that sorts array
 */
const sort = (comparator) => (arr) => [...arr].sort(comparator);

/**
 * Sort by a property or getter function.
 * Auto-detects type: uses localeCompare for strings, subtraction for numbers.
 *
 * @template T
 * @param {string | ((item: T) => string | number)} key - Property name or getter
 * @returns {(arr: T[]) => T[]} Function that sorts array
 *
 * @example
 * // By property name
 * sortBy("name")(users)
 * pipe(sortBy("age"))(users)
 *
 * @example
 * // By getter function
 * sortBy(x => x.name)(users)
 * pipe(sortBy(x => x.data.order))(items)
 */
const sortBy = (key) => {
  const getKey = typeof key === "function" ? key : propGetter(key);
  return sort(compareBy(getKey));
};

/**
 * Getter for a named property - sortBy's string form.
 * @param {string} key
 * @returns {(obj: any) => string | number}
 */
const propGetter = (key) => (obj) => obj[key];

/**
 * Remove duplicate values
 * @template T
 * @param {T[]} arr - Array to deduplicate
 * @returns {T[]} Array with unique values
 */
const unique = (arr) => [...new Set(arr)];

/**
 * Curried join function
 * @param {string} separator - Separator string
 * @returns {(arr: string[]) => string} Function that joins array
 */
const join = (separator) => (arr) => arr.join(separator);

/**
 * Curried split function
 * @param {string | RegExp} separator - Separator to split by
 * @returns {(str: string) => string[]} Function that splits string
 */
const split = (separator) => (str) => str.split(separator);

/**
 * Filter and map in a single pass (curried)
 *
 * Combines filter and map operations, processing each element once.
 * More expressive than chaining filter().map() when both operate
 * on the same items. Uses flatMap for a pure implementation.
 *
 * @template T, R
 * @param {(item: T) => boolean} predicate - Filter predicate
 * @param {(item: T) => R} transform - Transform function
 * @returns {(arr: T[]) => R[]} Function that filters and maps array
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
 * Remove falsy values from an array
 *
 * Filters out null, undefined, false, 0, '', and NaN.
 * Perfect for building arrays with conditional elements.
 *
 * @template T
 * @param {ReadonlyArray<T | false | null | undefined | 0 | "">} arr - Array potentially containing falsy values
 * @returns {T[]} Array with only truthy values (falsy values filtered out)
 *
 * @example
 * compact([1, null, 2, undefined, 3])        // [1, 2, 3]
 * compact(['a', false && 'b', 'c'])          // ['a', 'c']
 * compact([condition && 'value', 'always']) // conditionally includes 'value'
 */
const compact = (arr) => arr.flatMap((value) => (value ? [value] : []));

/**
 * Create a membership predicate factory with configurable negation.
 * Curried: (negate) => (values) => (value) => boolean
 *
 * This factory unifies memberOf and notMemberOf into a single pattern.
 *
 * @template T
 * @param {boolean} negate - Whether to negate the membership test
 * @returns {(values: T[]) => (value: T) => boolean} Membership predicate factory
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
 * @template T
 * @param {T[]} values - Values to check membership against
 * @returns {(value: T) => boolean} Membership predicate function
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
 * @template T
 * @param {T[]} values - Values to exclude
 * @returns {(value: T) => boolean} Negated membership predicate function
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
 * Filter out items that are in the exclusion list.
 * Shorthand for filter(notMemberOf(values)).
 *
 * @template T
 * @param {T[]} values - Values to exclude
 * @returns {(arr: T[]) => T[]} Function that filters out excluded values
 *
 * @example
 * exclude(['a', 'b'])(['a', 'b', 'c', 'd'])  // ['c', 'd']
 *
 * @example
 * // Use with pipe
 * pipe(
 *   exclude(EXCLUDED_FILES),
 *   map(toData),
 * )(files)
 */
const exclude = (values) => filter(notMemberOf(values));

/**
 * Async map with Promise.all (curried)
 *
 * Maps an async function over an iterable and waits for all results.
 * Handles iterables automatically (no need for Array.from).
 *
 * @template T, R
 * @param {(item: T, index: number) => Promise<R>} asyncFn - Async transform function
 * @returns {(iterable: Iterable<T>) => Promise<R[]>} Function that async-maps iterable
 *
 * @example
 * // Instead of: await Promise.all(Array.from(images).map(fn))
 * await mapAsync(processImage)(images)
 *
 * @example
 * // Use with pipe (note: pipe doesn't await, so use for sync filtering before async)
 * const items = pipe(filter(isValid), Array.from)(rawItems);
 * await mapAsync(fetchData)(items)
 */
const mapAsync = (asyncFn) => (iterable) =>
  Promise.all(Array.from(iterable, asyncFn));

/**
 * Create a pluralization formatter.
 * Curried: (singular, plural?) => (count) => string
 *
 * Returns a function that formats a count with the appropriate singular/plural form.
 * If plural is omitted, auto-derives it from singular (adds "es" if ends in "s", else "s").
 *
 * @param {string} singular - Singular form (e.g., "day", "item in order")
 * @param {string} [plural] - Plural form (optional, auto-derived if omitted)
 * @returns {(count: number) => string} Function that formats count with plural form
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

/* jscpd:ignore-start -- declaration data: exported name list */
export {
  compact,
  exclude,
  filter,
  filterMap,
  flatMap,
  join,
  map,
  mapAsync,
  memberOf,
  notMemberOf,
  pipe,
  pluralize,
  reduce,
  sort,
  sortBy,
  split,
  unique,
};
/* jscpd:ignore-end */
