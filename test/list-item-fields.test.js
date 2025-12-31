import listItemFields from "#data/listItemFields.js";
import { createTestRunner, expectDeepEqual } from "#test/test-utils.js";

const DEFAULT_FIELDS = [
  "thumbnail",
  "link",
  "price",
  "date",
  "subtitle",
  "location",
  "event-date",
  "cart-button",
];

const testCases = [
  {
    name: "listItemFields-is-array",
    description: "listItemFields exports an array",
    test: () => {
      if (!Array.isArray(listItemFields)) {
        throw new Error("listItemFields should be an array");
      }
    },
  },
  {
    name: "listItemFields-not-empty",
    description: "listItemFields is not empty",
    test: () => {
      if (listItemFields.length === 0) {
        throw new Error("listItemFields should not be empty");
      }
    },
  },
  {
    name: "listItemFields-valid-fields",
    description: "listItemFields contains only valid field names",
    test: () => {
      for (const field of listItemFields) {
        if (!DEFAULT_FIELDS.includes(field)) {
          throw new Error(`Invalid field name: ${field}`);
        }
      }
    },
  },
];

export default createTestRunner("list-item-fields", testCases);
