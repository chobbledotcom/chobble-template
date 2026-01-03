import { describe, test, expect } from "bun:test";
import listItemFields from "#data/listItemFields.js";

const { DEFAULT_FIELDS, selectListItemFields } = listItemFields._helpers;

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
    expect(result).toEqual(DEFAULT_FIELDS);
  });

  test("selectListItemFields returns DEFAULT_FIELDS when given null", () => {
    const result = selectListItemFields(null);
    expect(result).toEqual(DEFAULT_FIELDS);
  });

  test("selectListItemFields returns DEFAULT_FIELDS when given undefined", () => {
    const result = selectListItemFields(undefined);
    expect(result).toEqual(DEFAULT_FIELDS);
  });

  test("selectListItemFields returns DEFAULT_FIELDS when given a non-array value", () => {
    const result = selectListItemFields("not-an-array");
    expect(result).toEqual(DEFAULT_FIELDS);
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
      "cart-button",
    ];
    expect(DEFAULT_FIELDS).toHaveLength(expected.length);
    for (const field of expected) {
      expect(DEFAULT_FIELDS.includes(field)).toBe(true);
    }
  });
});
