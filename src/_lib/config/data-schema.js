/**
 * Validation shared by the schema-declared site data files: config.json
 * (`#config/config-schema.js`) and site.json (`#config/site-schema.js`).
 *
 * A schema maps each key the file accepts to a `DataField`. A file's errors
 * are its unknown keys (naming the accepted ones, so a typo is obvious), its
 * missing required fields, and each set value of the wrong type or outside
 * its `choices`. Null counts as unset, so it keeps a setting's default.
 */
import { frozenSet } from "#utils/fp/set.js";

/**
 * @typedef {Object} DataField
 * @property {"boolean" | "string" | "number" | "object" | "image"} type - `image` is a path string
 * @property {boolean} [list] - The value is an array of `type`
 * @property {string[]} [choices] - Allowed values (each item, for a list)
 * @property {boolean} [required] - Must be set to a non-blank value
 * @property {unknown} [default] - Applied when the key is omitted or null
 * @property {string} [label] - CMS label; a field without one is not editable in the CMS
 * @property {Record<string, DataField>} [fields] - CMS sub-fields of an object
 * @property {string} [description] - What the field does, for the reference (every top-level field has one)
 */

/**
 * An `image` field stores a path, so it checks as a string.
 * @type {{ label: string, check: (value: unknown) => boolean }}
 */
const STRING_CHECK = {
  label: "a string",
  check: (value) => typeof value === "string",
};

/**
 * Runtime check and message wording for each field type.
 * @type {Record<DataField["type"], { label: string, check: (value: unknown) => boolean }>}
 */
const TYPE_CHECKS = {
  boolean: { label: "a boolean", check: (value) => typeof value === "boolean" },
  string: STRING_CHECK,
  image: STRING_CHECK,
  number: { label: "a number", check: (value) => typeof value === "number" },
  object: {
    label: "an object",
    check: (value) =>
      typeof value === "object" && value !== null && !Array.isArray(value),
  },
};

/**
 * Whether a set value has its field's type: every item's, for a list.
 * @param {DataField} field
 * @param {unknown} value
 */
const fitsType = (field, value) =>
  field.list
    ? Array.isArray(value) && value.every(TYPE_CHECKS[field.type].check)
    : TYPE_CHECKS[field.type].check(value);

/** @param {unknown} value */
const isUnset = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.trim() === "");

/**
 * Checks one key of a data file against its field. The type and choices
 * checks only speak about a set value, and choices only once the type fits,
 * so each problem gets one message.
 * @type {Array<(file: string, key: string, field: DataField, value: unknown) => string[]>}
 */
const FIELD_ERROR_COLLECTORS = [
  (file, key, field, value) =>
    field.required && isUnset(value)
      ? [`${file} is missing the '${key}' field`]
      : [],
  (file, key, field, value) =>
    isUnset(value) || fitsType(field, value)
      ? []
      : [
          `${file} '${key}' must be ${field.list ? `a list of ${field.type}s` : TYPE_CHECKS[field.type].label}, got: ${JSON.stringify(value)}`,
        ],
  (file, key, field, value) => {
    if (!field.choices || isUnset(value) || !fitsType(field, value)) return [];
    const allowed = frozenSet(field.choices);
    const items = [value].flat();
    return items.every((item) => allowed.has(`${item}`))
      ? []
      : [
          `${file} '${key}' must be one of ${field.choices.join(", ")}, got: ${items.join(", ")}`,
        ];
  },
];

/**
 * The error for keys a data file sets that its accepted set does not define,
 * naming the accepted keys so a typo is obvious; none when every key is known.
 * @param {string} file - Data file name for the message
 * @param {Record<string, unknown>} value - The file's parsed object
 * @param {Record<string, unknown>} accepted - Object whose keys are accepted
 * @returns {string[]}
 */
const unknownKeyErrors = (file, value, accepted) => {
  const unknown = Object.keys(value).filter(
    (key) => !Object.hasOwn(accepted, key),
  );
  return unknown.length > 0
    ? [
        `${file} has unknown keys: ${unknown.join(", ")}. Accepted keys: ${Object.keys(accepted).join(", ")}`,
      ]
    : [];
};

/**
 * Every problem with a data file's parsed object against its schema.
 * @param {string} file - Data file name for the messages
 * @param {Record<string, DataField>} schema
 * @returns {(data: Record<string, unknown>) => string[]}
 */
const schemaErrors = (file, schema) => (data) => [
  ...unknownKeyErrors(file, data, schema),
  ...Object.entries(schema).flatMap(([key, field]) =>
    FIELD_ERROR_COLLECTORS.flatMap((collect) =>
      collect(file, key, field, data[key]),
    ),
  ),
];

export { schemaErrors, unknownKeyErrors };
