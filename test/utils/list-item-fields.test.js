import listItemFields from "#data/listItemFields.js";

const { DEFAULT_FIELDS, selectListItemFields } = listItemFields._helpers;

import {
  createTestRunner,
  expectDeepEqual,
  expectStrictEqual,
  expectTrue,
} from "#test/test-utils.js";

const testCases = [
  {
    name: "exports-array",
    description: "listItemFields exports an array",
    test: () => {
      expectTrue(
        Array.isArray(listItemFields),
        "listItemFields should be an array",
      );
    },
  },
  {
    name: "exports-non-empty-array",
    description: "listItemFields is not empty",
    test: () => {
      expectTrue(
        listItemFields.length > 0,
        "listItemFields should not be empty",
      );
    },
  },
  {
    name: "selectListItemFields-returns-config-when-valid-array",
    description:
      "selectListItemFields returns config fields when given a non-empty array",
    test: () => {
      const configFields = ["link", "price"];
      const result = selectListItemFields(configFields);
      expectDeepEqual(result, configFields, "Should return the config array");
    },
  },
  {
    name: "selectListItemFields-returns-defaults-for-empty-array",
    description:
      "selectListItemFields returns DEFAULT_FIELDS when given an empty array",
    test: () => {
      const result = selectListItemFields([]);
      expectDeepEqual(
        result,
        DEFAULT_FIELDS,
        "Should return DEFAULT_FIELDS for empty array",
      );
    },
  },
  {
    name: "selectListItemFields-returns-defaults-for-null",
    description: "selectListItemFields returns DEFAULT_FIELDS when given null",
    test: () => {
      const result = selectListItemFields(null);
      expectDeepEqual(
        result,
        DEFAULT_FIELDS,
        "Should return DEFAULT_FIELDS for null",
      );
    },
  },
  {
    name: "selectListItemFields-returns-defaults-for-undefined",
    description:
      "selectListItemFields returns DEFAULT_FIELDS when given undefined",
    test: () => {
      const result = selectListItemFields(undefined);
      expectDeepEqual(
        result,
        DEFAULT_FIELDS,
        "Should return DEFAULT_FIELDS for undefined",
      );
    },
  },
  {
    name: "selectListItemFields-returns-defaults-for-non-array",
    description:
      "selectListItemFields returns DEFAULT_FIELDS when given a non-array value",
    test: () => {
      const result = selectListItemFields("not-an-array");
      expectDeepEqual(
        result,
        DEFAULT_FIELDS,
        "Should return DEFAULT_FIELDS for string",
      );
    },
  },
  {
    name: "default-fields-contains-expected-values",
    description: "DEFAULT_FIELDS contains all expected field names",
    test: () => {
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
      expectStrictEqual(
        DEFAULT_FIELDS.length,
        expected.length,
        "DEFAULT_FIELDS should have correct number of fields",
      );
      for (const field of expected) {
        expectTrue(
          DEFAULT_FIELDS.includes(field),
          `DEFAULT_FIELDS should include "${field}"`,
        );
      }
    },
  },
];

export default createTestRunner("list-item-fields", testCases);
