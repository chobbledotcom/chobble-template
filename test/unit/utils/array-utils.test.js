import { describe, expect, test } from "bun:test";
import { data, expectObjectProps, toData } from "#test/test-utils.js";
import {
  compact,
  filter,
  filterMap,
  findDuplicate,
  listSeparator,
  map,
  memberOf,
  notMemberOf,
  pick,
  pipe,
  pluralize,
  sort,
  sortBy,
  uniqueBy,
} from "#toolkit/fp/array.js";

describe("array-utils", () => {
  // ============================================
  // pick Tests
  // ============================================
  test("Picks specified keys from object", () => {
    expect(pick(["a", "c"])({ a: 1, b: 2, c: 3 })).toEqual({ a: 1, c: 3 });
  });

  test("Ignores keys not in object", () => {
    expect(pick(["a", "missing"])({ a: 1, b: 2 })).toEqual({ a: 1 });
  });

  test("Works with map for array of objects", () => {
    const users = [
      { name: "Alice", age: 30, role: "admin" },
      { name: "Bob", age: 25, role: "user" },
    ];
    expect(users.map(pick(["name", "age"]))).toEqual([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
  });

  // ============================================
  // compact Tests
  // ============================================
  test("Removes falsy values from array", () => {
    expect(compact([1, null, 2, undefined, 3])).toEqual([1, 2, 3]);
  });

  test("Removes false, 0, empty string, NaN", () => {
    expect(compact([1, false, 2, 0, 3, "", Number.NaN])).toEqual([1, 2, 3]);
  });

  test("Works with conditional elements", () => {
    const condition = false;
    // biome-ignore lint/nursery/noUnnecessaryConditions: intentional test of falsy value removal
    expect(compact([condition && "value", "always"])).toEqual(["always"]);
  });

  // ============================================
  // listSeparator Tests
  // ============================================
  test("Returns comma for most items", () => {
    const sep = listSeparator(4);
    expect(sep(0)).toBe(", ");
    expect(sep(1)).toBe(", ");
  });

  test("Returns 'and' for second-to-last item", () => {
    const sep = listSeparator(3);
    expect(sep(1)).toBe(" and ");
  });

  test("Returns empty string for last item", () => {
    const sep = listSeparator(3);
    expect(sep(2)).toBe("");
  });

  // ============================================
  // findDuplicate Tests
  // ============================================
  test("Finds first duplicate value in simple array", () => {
    expect(findDuplicate([1, 2, 1])).toBe(1);
    expect(findDuplicate([1, 2, 3, 2, 1])).toBe(2);
  });

  test("Returns undefined when no duplicates exist", () => {
    expect(findDuplicate([1, 2, 3])).toBe(undefined);
    expect(findDuplicate([])).toBe(undefined);
  });

  test("Finds duplicate using key extractor", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 1 }];
    const duplicate = findDuplicate(items, (x) => x.id);

    expect(duplicate).toEqual({ id: 1 });
    expect(duplicate).toBe(items[2]); // Returns the duplicate item itself
  });

  test("Returns first duplicate when multiple exist", () => {
    expect(findDuplicate([1, 2, 1, 3, 2])).toBe(1);
  });

  test("Works with string values", () => {
    expect(findDuplicate(["a", "b", "a"])).toBe("a");
    expect(findDuplicate(["a", "b", "c"])).toBe(undefined);
  });

  test("Works with objects using nested key", () => {
    const options = [
      { days: 1, price: 10 },
      { days: 3, price: 25 },
      { days: 1, price: 15 },
    ];

    const duplicate = findDuplicate(options, (opt) => opt.days);
    expectObjectProps({
      days: 1,
      price: 15, // It's the second occurrence
    })(duplicate);
  });

  // ============================================
  // memberOf Tests
  // ============================================
  test("memberOf returns true for values in collection", () => {
    const isWeekend = memberOf(["saturday", "sunday"]);
    expect(isWeekend("saturday")).toBe(true);
    expect(isWeekend("sunday")).toBe(true);
  });

  test("memberOf returns false for values not in collection", () => {
    const isWeekend = memberOf(["saturday", "sunday"]);
    expect(isWeekend("monday")).toBe(false);
    expect(isWeekend("friday")).toBe(false);
  });

  test("memberOf works with filter", () => {
    const validCodes = memberOf(["A1", "B2", "C3"]);
    const codes = ["A1", "X9", "B2", "Z0", "C3"];
    expect(codes.filter(validCodes)).toEqual(["A1", "B2", "C3"]);
  });

  test("memberOf works with some", () => {
    const hasFruit = memberOf(["apple", "banana", "orange"]);
    expect(["carrot", "banana", "potato"].some(hasFruit)).toBe(true);
    expect(["carrot", "broccoli", "potato"].some(hasFruit)).toBe(false);
  });

  test("memberOf works with every", () => {
    const isDigit = memberOf([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ]);
    expect(["1", "2", "3"].every(isDigit)).toBe(true);
    expect(["1", "a", "3"].every(isDigit)).toBe(false);
  });

  test("memberOf works with numbers", () => {
    const isPrime = memberOf([2, 3, 5, 7, 11, 13]);
    expect(isPrime(7)).toBe(true);
    expect(isPrime(4)).toBe(false);
  });

  test("memberOf handles empty collection", () => {
    const isEmpty = memberOf([]);
    expect(isEmpty("anything")).toBe(false);
  });

  // ============================================
  // notMemberOf Tests
  // ============================================
  test("notMemberOf returns true for values not in collection", () => {
    const isNotReserved = notMemberOf(["admin", "root", "system"]);
    expect(isNotReserved("user")).toBe(true);
    expect(isNotReserved("guest")).toBe(true);
  });

  test("notMemberOf returns false for values in collection", () => {
    const isNotReserved = notMemberOf(["admin", "root", "system"]);
    expect(isNotReserved("admin")).toBe(false);
    expect(isNotReserved("root")).toBe(false);
  });

  test("notMemberOf works with filter to exclude items", () => {
    const isNotExcluded = notMemberOf(["spam", "trash"]);
    const folders = ["inbox", "spam", "drafts", "trash", "sent"];
    expect(folders.filter(isNotExcluded)).toEqual(["inbox", "drafts", "sent"]);
  });

  test("notMemberOf handles empty collection", () => {
    const isNotEmpty = notMemberOf([]);
    expect(isNotEmpty("anything")).toBe(true);
  });

  test("notMemberOf is the logical inverse of memberOf", () => {
    const values = ["a", "b", "c"];
    const isMember = memberOf(values);
    const isNotMember = notMemberOf(values);

    for (const v of ["a", "b", "c", "d", "e"]) {
      expect(isNotMember(v)).toBe(!isMember(v));
    }
  });

  // ============================================
  // filterMap Tests
  // ============================================
  test("filterMap filters and maps in one pass", () => {
    const numbers = [1, -2, 3, -4, 5];
    const result = filterMap(
      (n) => n > 0,
      (n) => n * 2,
    )(numbers);
    expect(result).toEqual([2, 6, 10]);
  });

  test("filterMap returns empty array when nothing matches", () => {
    const numbers = [1, 2, 3];
    const result = filterMap(
      (n) => n > 10,
      (n) => n * 2,
    )(numbers);
    expect(result).toEqual([]);
  });

  test("filterMap transforms all items when all match predicate", () => {
    const numbers = [1, 2, 3];
    const result = filterMap(
      () => true,
      (n) => n * 2,
    )(numbers);
    expect(result).toEqual([2, 4, 6]);
  });

  test("filterMap works with objects", () => {
    const users = [
      { name: "Alice", active: true },
      { name: "Bob", active: false },
      { name: "Charlie", active: true },
    ];
    const result = filterMap(
      (user) => user.active,
      (user) => user.name,
    )(users);
    expect(result).toEqual(["Alice", "Charlie"]);
  });

  test("filterMap handles empty arrays", () => {
    const result = filterMap(
      () => true,
      (x) => x,
    )([]);
    expect(result).toEqual([]);
  });

  test("filterMap works with pipe", () => {
    const numbers = [5, -3, 1, -7, 4, 2];
    const result = pipe(
      filterMap(
        (n) => n > 0,
        (n) => n * 10,
      ),
      sort((a, b) => a - b),
    )(numbers);
    expect(result).toEqual([10, 20, 40, 50]);
  });

  test("filterMap is curried for reuse", () => {
    const getActiveNames = filterMap(
      (user) => user.active,
      (user) => user.name,
    );

    const team1 = [
      { name: "A", active: true },
      { name: "B", active: false },
    ];
    const team2 = [
      { name: "C", active: false },
      { name: "D", active: true },
    ];

    expect(getActiveNames(team1)).toEqual(["A"]);
    expect(getActiveNames(team2)).toEqual(["D"]);
  });

  // ============================================
  // data Tests
  // ============================================
  test("data creates items with defaults and field mappings", () => {
    const product = data({ categories: [] });
    const products = product("title", "keywords")(
      ["Widget A", ["portable"]],
      ["Widget B", ["stationary"]],
    );

    expect(products).toEqual([
      { data: { categories: [], title: "Widget A", keywords: ["portable"] } },
      { data: { categories: [], title: "Widget B", keywords: ["stationary"] } },
    ]);
  });

  test("data merges field values over defaults", () => {
    const event = data({ hidden: false, featured: true });
    const events = event("title", "hidden")(
      ["Visible Event", false],
      ["Hidden Event", true],
    );

    expect(events[0].data.hidden).toBe(false);
    expect(events[1].data.hidden).toBe(true);
    expect(events[0].data.featured).toBe(true);
    expect(events[1].data.featured).toBe(true);
  });

  test("data works with empty defaults", () => {
    const item = data({});
    const items = item("name", "value")(["foo", 42], ["bar", 100]);

    expect(items).toEqual([
      { data: { name: "foo", value: 42 } },
      { data: { name: "bar", value: 100 } },
    ]);
  });

  test("data handles single row", () => {
    const review = data({ rating: 5 });
    const reviews = review("title", "author")(["Great product!", "Alice"]);

    expect(reviews).toEqual([
      { data: { rating: 5, title: "Great product!", author: "Alice" } },
    ]);
  });

  test("data handles many fields", () => {
    const product = data({});
    const products = product(
      "title",
      "price",
      "category",
      "featured",
      "stock",
    )(["Widget", 999, "tools", true, 50]);

    expect(products[0].data).toEqual({
      title: "Widget",
      price: 999,
      category: "tools",
      featured: true,
      stock: 50,
    });
  });

  test("data is reusable with different field configurations", () => {
    const baseItem = data({ active: true });
    const byTitle = baseItem("title");
    const byTitleAndPrice = baseItem("title", "price");

    const items1 = byTitle(["Item A"], ["Item B"]);
    const items2 = byTitleAndPrice(["Product X", 100], ["Product Y", 200]);

    expect(items1).toEqual([
      { data: { active: true, title: "Item A" } },
      { data: { active: true, title: "Item B" } },
    ]);
    expect(items2).toEqual([
      { data: { active: true, title: "Product X", price: 100 } },
      { data: { active: true, title: "Product Y", price: 200 } },
    ]);
  });

  test("data composes with map for post-processing", () => {
    const addDate = map((item) => ({
      ...item,
      date: new Date(item.data.dateStr),
    }));
    const review = data({ rating: 5 });

    // Create items first, then apply transformation
    const rawReviews = review("title", "dateStr")(
      ["Great!", "2024-01-01"],
      ["Good", "2024-01-02"],
    );
    const reviews = addDate(rawReviews);

    expect(reviews[0].data.title).toBe("Great!");
    expect(reviews[0].date).toBeInstanceOf(Date);
    expect(reviews[1].date.toISOString()).toContain("2024-01-02");
  });

  test("data handles undefined values in rows", () => {
    const item = data({ defaultVal: "default" });
    const items = item("a", "b")(["first", undefined], [undefined, "second"]);

    expect(items[0].data.a).toBe("first");
    expect(items[0].data.b).toBe(undefined);
    expect(items[1].data.a).toBe(undefined);
    expect(items[1].data.b).toBe("second");
  });

  test("data returns empty array when no rows provided", () => {
    const item = data({ active: true });
    const items = item("title")();

    expect(items).toEqual([]);
  });

  // ============================================
  // toData Tests (pipeable version)
  // ============================================
  test("toData accepts array input for piping", () => {
    const product = toData({ stock: 10 });
    const rows = [
      ["Gadget X", 49.99],
      ["Gadget Y", 29.99],
    ];

    const products = product("name", "price")(rows);

    expect(products).toEqual([
      { data: { stock: 10, name: "Gadget X", price: 49.99 } },
      { data: { stock: 10, name: "Gadget Y", price: 29.99 } },
    ]);
  });

  test("toData works with pipe for pre-processing", () => {
    const parsePrice = map(([title, price]) => [title, Number(price)]);
    const product = toData({ inStock: true });
    const csvRows = [
      ["Phone", "299"],
      ["Tablet", "499"],
    ];

    const products = pipe(parsePrice, product("item", "cost"))(csvRows);

    expect(products[0].data.cost).toBe(299);
    expect(products[1].data.cost).toBe(499);
  });

  test("toData works with filter in pipe", () => {
    const onlyActive = filter(([_, active]) => active);
    const item = toData({ type: "record" });
    const rows = [
      ["Entry A", true],
      ["Entry B", false],
      ["Entry C", true],
    ];

    const items = pipe(onlyActive, item("label", "enabled"))(rows);

    expect(items.length).toBe(2);
    expect(items[0].data.label).toBe("Entry A");
    expect(items[1].data.label).toBe("Entry C");
  });

  test("toData returns empty array for empty input", () => {
    const item = toData({ ready: false });
    const items = item("id")([]);

    expect(items).toEqual([]);
  });

  test("toData handles complex pipe chains with post-processing", () => {
    const addTimestamp = map((item) => ({
      ...item,
      created: new Date(item.data.isoDate),
    }));
    const entry = toData({ version: 1 });
    const rawRows = [
      ["Log A", "2024-03-01"],
      ["Log B", "2024-03-15"],
    ];

    const entries = pipe(entry("name", "isoDate"), addTimestamp)(rawRows);

    expect(entries[0].data.name).toBe("Log A");
    expect(entries[0].created).toBeInstanceOf(Date);
    expect(entries[1].created.toISOString()).toContain("2024-03-15");
  });

  // ============================================
  // sortBy Tests
  // ============================================
  test("sortBy sorts by property name", () => {
    const users = [{ name: "Charlie" }, { name: "Alice" }, { name: "Bob" }];
    const sorted = sortBy("name")(users);
    expect(sorted.map((u) => u.name)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  test("sortBy sorts by getter function", () => {
    const items = [
      { data: { order: 3 } },
      { data: { order: 1 } },
      { data: { order: 2 } },
    ];
    const sorted = sortBy((x) => x.data.order)(items);
    expect(sorted.map((x) => x.data.order)).toEqual([1, 2, 3]);
  });

  test("sortBy works with pipe", () => {
    const numbers = [{ val: 5 }, { val: 2 }, { val: 8 }];
    const result = pipe(sortBy("val"))(numbers);
    expect(result.map((n) => n.val)).toEqual([2, 5, 8]);
  });

  // ============================================
  // uniqueBy Tests
  // ============================================
  test("uniqueBy removes duplicates by key", () => {
    const items = [
      { id: 1, name: "first" },
      { id: 2, name: "second" },
      { id: 1, name: "duplicate" },
    ];
    const result = uniqueBy((x) => x.id)(items);
    expect(result.length).toBe(2);
    expect(result.map((x) => x.id)).toEqual([1, 2]);
  });

  test("uniqueBy keeps last occurrence (Map behavior)", () => {
    const items = [
      { id: "a", val: 1 },
      { id: "a", val: 2 },
    ];
    const result = uniqueBy((x) => x.id)(items);
    expect(result[0].val).toBe(2);
  });

  test("uniqueBy handles empty array", () => {
    const result = uniqueBy((x) => x)([]);
    expect(result).toEqual([]);
  });

  // ============================================
  // pluralize Tests
  // ============================================
  test("pluralize formats singular count", () => {
    const formatDays = pluralize("day");
    expect(formatDays(1)).toBe("1 day");
  });

  test("pluralize formats plural count", () => {
    const formatDays = pluralize("day");
    expect(formatDays(5)).toBe("5 days");
  });

  test("pluralize adds 'es' for words ending in 's'", () => {
    const formatClasses = pluralize("class");
    expect(formatClasses(1)).toBe("1 class");
    expect(formatClasses(2)).toBe("2 classes");
  });

  test("pluralize uses custom plural form", () => {
    const formatItems = pluralize("item in order", "items in order");
    expect(formatItems(1)).toBe("1 item in order");
    expect(formatItems(3)).toBe("3 items in order");
  });

  test("pluralize handles zero", () => {
    const formatItems = pluralize("item");
    expect(formatItems(0)).toBe("0 items");
  });
});
