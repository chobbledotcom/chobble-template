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
 * @example
 * mapEntries((k, v) => `${k}=${v}`)({ a: 1 }) // ['a=1']
 */
const mapEntries = (fn) => (obj) =>
  Object.entries(obj).map(([k, v]) => fn(k, v));

/**
 * Curried every check over entries -> returns boolean
 * @example
 * everyEntry((k, v) => v > 0)({ a: 1, b: 2 }) // true
 */
const everyEntry = (predicate) => (obj) =>
  Object.entries(obj).every(([k, v]) => predicate(k, v));

/**
 * Curried object transformation -> returns new object
 * Callback must return [newKey, newValue] tuple
 * @example
 * mapObject((k, v) => [k.toUpperCase(), v * 2])({ a: 1 }) // { A: 2 }
 */
const mapObject = (fn) => (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => fn(k, v)));

/**
 * Curried object filtering -> returns new object
 * @example
 * filterObject((k, v) => v > 0)({ a: 1, b: -1 }) // { a: 1 }
 */
const filterObject = (predicate) => (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([k, v]) => predicate(k, v)));

// Common pre-built utilities

/**
 * Transform both key and value with the same function
 * @example
 * mapBoth(s => s.toLowerCase())({ FOO: 'BAR' }) // { foo: 'bar' }
 */
const mapBoth = (fn) => mapObject((k, v) => [fn(k), fn(v)]);

/**
 * Keep only entries with truthy values
 * @example
 * pickTruthy({ a: 1, b: null, c: '' }) // { a: 1 }
 */
const pickTruthy = filterObject((_k, v) => v);

export { mapEntries, everyEntry, mapObject, filterObject, mapBoth, pickTruthy };
