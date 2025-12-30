import {
  DEFAULT_FIELDS,
  getFieldOrder,
} from "#eleventy/list-item-fields.js";
import {
  createTestRunner,
  expectDeepEqual,
} from "./test-utils.js";

const testCases = [
  // DEFAULT_FIELDS constant test
  {
    name: "DEFAULT_FIELDS-order",
    description: "Default fields are in expected order",
    test: () => {
      expectDeepEqual(
        DEFAULT_FIELDS,
        [
          "thumbnail",
          "link",
          "price",
          "date",
          "subtitle",
          "location",
          "event-date",
          "cart-button",
        ],
        "Should have all fields in correct order",
      );
    },
  },

  // getFieldOrder tests
  {
    name: "getFieldOrder-default-empty-config",
    description: "Returns default fields when config is empty object",
    test: () => {
      expectDeepEqual(
        getFieldOrder({}),
        DEFAULT_FIELDS,
        "Should return default fields for empty config",
      );
    },
  },
  {
    name: "getFieldOrder-default-null-field",
    description: "Returns default fields when list_item_fields is null",
    test: () => {
      expectDeepEqual(
        getFieldOrder({ list_item_fields: null }),
        DEFAULT_FIELDS,
        "Should return default fields when null",
      );
    },
  },
  {
    name: "getFieldOrder-default-empty-array",
    description: "Returns default fields when list_item_fields is empty array",
    test: () => {
      expectDeepEqual(
        getFieldOrder({ list_item_fields: [] }),
        DEFAULT_FIELDS,
        "Should return default fields when empty array",
      );
    },
  },
  {
    name: "getFieldOrder-default-null-config",
    description: "Returns default fields when config is null",
    test: () => {
      expectDeepEqual(
        getFieldOrder(null),
        DEFAULT_FIELDS,
        "Should return default fields when config is null",
      );
    },
  },
  {
    name: "getFieldOrder-default-undefined-config",
    description: "Returns default fields when config is undefined",
    test: () => {
      expectDeepEqual(
        getFieldOrder(undefined),
        DEFAULT_FIELDS,
        "Should return default fields when config is undefined",
      );
    },
  },
  {
    name: "getFieldOrder-custom-order",
    description: "Returns custom field order from config",
    test: () => {
      const customFields = ["link", "price", "thumbnail"];
      expectDeepEqual(
        getFieldOrder({ list_item_fields: customFields }),
        customFields,
        "Should return custom field order",
      );
    },
  },
  {
    name: "getFieldOrder-partial-fields",
    description: "Returns partial field list from config",
    test: () => {
      const partialFields = ["link", "price"];
      expectDeepEqual(
        getFieldOrder({ list_item_fields: partialFields }),
        partialFields,
        "Should return partial field list",
      );
    },
  },
  {
    name: "getFieldOrder-reordered",
    description: "Returns fields in specified order",
    test: () => {
      const reordered = ["price", "thumbnail", "link", "subtitle"];
      expectDeepEqual(
        getFieldOrder({ list_item_fields: reordered }),
        reordered,
        "Should return fields in specified order",
      );
    },
  },
  {
    name: "getFieldOrder-single-field",
    description: "Returns single field when configured",
    test: () => {
      const singleField = ["link"];
      expectDeepEqual(
        getFieldOrder({ list_item_fields: singleField }),
        singleField,
        "Should return single field",
      );
    },
  },
];

export default createTestRunner("list-item-fields", testCases);
