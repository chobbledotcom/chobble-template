import { describe, expect, test } from "bun:test";
import {
  DEFAULT_LIST_ITEM_FIELDS,
  selectListItemFields,
} from "#config/list-config.js";
import listItemFields from "#data/listItemFields.js";

describe("list-item-fields", () => {
  test("listItemFields exports an array", () => {
    expect(Array.isArray(listItemFields)).toBe(true);
  });

  test("listItemFields is not empty", () => {
    expect(listItemFields.length > 0).toBe(true);
  });

  test("selectListItemFields returns config fields when given a non-empty array", () => {
    const configFields = ["link", "price"];
    const result = selectListItemFields(configFields);
    expect(result).toEqual(configFields);
  });

  test("selectListItemFields returns DEFAULT_FIELDS when given an empty array", () => {
    const result = selectListItemFields([]);
    expect(result).toEqual(DEFAULT_LIST_ITEM_FIELDS);
  });

  test("selectListItemFields returns DEFAULT_FIELDS when given null", () => {
    const result = selectListItemFields(null);
    expect(result).toEqual(DEFAULT_LIST_ITEM_FIELDS);
  });

  test("selectListItemFields returns DEFAULT_FIELDS when given undefined", () => {
    const result = selectListItemFields(undefined);
    expect(result).toEqual(DEFAULT_LIST_ITEM_FIELDS);
  });

  test("selectListItemFields returns DEFAULT_FIELDS when given a non-array value", () => {
    const result = selectListItemFields("not-an-array");
    expect(result).toEqual(DEFAULT_LIST_ITEM_FIELDS);
  });

  test("DEFAULT_FIELDS contains all expected field names", () => {
    const expected = [
      "thumbnail",
      "link",
      "price",
      "date",
      "subtitle",
      "location",
      "event-date",
      "specs",
      "cart-button",
    ];
    expect(DEFAULT_LIST_ITEM_FIELDS).toHaveLength(expected.length);
    for (const field of expected) {
      expect(DEFAULT_LIST_ITEM_FIELDS.includes(field)).toBe(true);
    }
  });
});
