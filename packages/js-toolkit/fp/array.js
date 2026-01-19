/**
 * Functional array utilities
 */
import { compareBy } from "./sorting.js";

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
  const getKey = typeof key === "function" ? key : (obj) => obj[key];
  return sort(compareBy(getKey));
};

/**
 * Remove duplicate values
 * @template T
 * @param {T[]} arr - Array to deduplicate
 * @returns {T[]} Array with unique values
 */
const unique = (arr) => [...new Set(arr)];

/**
 * Remove duplicates by key extraction function
 * @template T, K
 * @param {(item: T) => K} getKey - Key extraction function
 * @returns {(arr: T[]) => T[]} Function that deduplicates array by key
 */
const uniqueBy = (getKey) => (arr) => [
  ...new Map(arr.map((item) => [getKey(item), item])).values(),
];

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
 * Create a picker function for the specified keys (curried form)
 *
 * Returns a function that extracts only the specified keys from an object.
 * This curried form works perfectly with map(): arr.map(pick(['a', 'b']))
 *
 * @template {string} K
 * @template {Record<K, unknown>} T
 * @param {K[]} keys - Keys to include
 * @returns {(obj: T) => Pick<T, K>} Function that picks specified keys from an object
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
 * @param {unknown[]} arr - Array potentially containing falsy values
 * @returns {unknown[]} Array with only truthy values (falsy values filtered out)
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
 * @template T
 * @param {T[]} items - Array to check for duplicates
 * @param {(item: T) => unknown} [getKey] - Optional key extractor (defaults to identity)
 * @returns {T | undefined} First duplicate item, or undefined
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
 * @template T
 * @template R
 * @param {(acc: R[], item: T, index: number, array: T[]) => R[]} fn - Accumulator callback
 * @returns {(arr: T[]) => R[]} Function that accumulates array
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

/**
 * Pipeable curried data transform for creating collections of objects.
 *
 * Transforms an array of value tuples into objects with a `data` property.
 * Use this when you need to chain transformations with pipe().
 *
 * Curried as: (defaults) => (...fields) => (rows) => items
 *
 * @template T
 * @param {T} defaults - Default properties merged into every item's data
 * @returns {(...fields: string[]) => (rows: any[][]) => Array<{data: T & Record<string, any>}>}
 *
 * @example
 * // Use with pipe to transform input before creating objects
 * const csvRows = [
 *   ["Widget A", "100"],
 *   ["Widget B", "200"],
 * ];
 *
 * const product = toData({ categories: [] });
 * const parsePrice = map(([title, price]) => [title, Number(price)]);
 *
 * const products = pipe(
 *   parsePrice,
 *   product("title", "price"),
 * )(csvRows);
 * // Returns: [
 * //   { data: { categories: [], title: "Widget A", price: 100 } },
 * //   { data: { categories: [], title: "Widget B", price: 200 } },
 * // ]
 */
const toData =
  (defaults) =>
  (...fields) =>
  (rows) =>
    rows.map((values) => ({
      data: {
        ...defaults,
        ...Object.fromEntries(fields.map((f, i) => [f, values[i]])),
      },
    }));

/**
 * Curried data transform for creating collections of objects.
 *
 * Creates a factory that transforms rows of values into objects with
 * a consistent structure. Perfect for test fixtures where you need
 * many similar objects with slight variations.
 *
 * Curried as: (defaults) => (...fields) => (...rows) => items
 *
 * @template T
 * @param {T} defaults - Default properties merged into every item's data
 * @returns {(...fields: string[]) => (...rows: any[][]) => Array<{data: T & Record<string, any>}>}
 *
 * @example
 * // Define a product factory with default categories
 * const product = data({ categories: [] });
 *
 * // Create products with title and keywords fields
 * const products = product("title", "keywords")(
 *   ["Widget A", ["portable"]],
 *   ["Widget B", ["stationary"]],
 * );
 * // Returns: [
 * //   { data: { categories: [], title: "Widget A", keywords: ["portable"] } },
 * //   { data: { categories: [], title: "Widget B", keywords: ["stationary"] } },
 * // ]
 */
const data =
  (defaults) =>
  (...fields) =>
  (...rows) =>
    toData(defaults)(...fields)(rows);

export {
  accumulate,
  compact,
  data,
  exclude,
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
  sortBy,
  split,
  toData,
  unique,
  uniqueBy,
};
