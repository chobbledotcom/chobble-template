/**
 * Functional programming utilities
 *
 * @example
 * import { pipe, filter, map, memoize } from "@chobble/js-toolkit/fp";
 *
 * const processItems = pipe(
 *   filter(item => item.active),
 *   map(item => item.name),
 *   unique
 * );
 */

// Array utilities
export {
  compact,
  exclude,
  filter,
  filterMap,
  findDuplicate,
  flatMap,
  join,
  listSeparator,
  map,
  memberOf,
  notMemberOf,
  pick,
  pipe,
  pluralize,
  reduce,
  sort,
  sortBy,
  split,
  unique,
  uniqueBy,
} from "./array.js";
// Grouping utilities
export {
  buildFirstOccurrenceLookup,
  buildReverseIndex,
  groupBy,
  groupValuesBy,
} from "./grouping.js";
// Memoization utilities
export {
  groupByWithCache,
  indexBy,
  jsonKey,
  memoize,
  withWeakMapCache,
} from "./memoize.js";
// Object utilities
export {
  fromPairs,
  mapBoth,
  mapEntries,
  mapObject,
  omit,
  pickNonNull,
  pickTruthy,
  toObject,
} from "./object.js";
// Set utilities
export { frozenSet, frozenSetFrom, setHas, setLacks } from "./set.js";
// Sorting utilities
export {
  compareBy,
  compareStrings,
  createOrderThenStringComparator,
  descending,
} from "./sorting.js";
