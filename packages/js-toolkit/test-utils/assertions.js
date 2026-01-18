/**
 * Test assertion utilities
 *
 * These utilities work with bun:test's expect function.
 * Import expect from bun:test in your test files.
 */

/**
 * Assert that an object has expected property values.
 * Curried for use with pipe: first call with expected props map.
 *
 * @param {Object} propMap - Map of property names to expected values
 * @returns {Function} (obj) => obj (returns obj for chaining in pipe)
 *
 * @example
 * expectObjectProps({ name: "foo", count: 42 })(myObj);
 *
 * @example
 * // Use with pipe
 * pipe(
 *   expectObjectProps({ item_widths: "240,480,640" }),
 *   expectObjectProps({ gallery_thumb_widths: "240,480" })
 * )(DEFAULT_PRODUCT_DATA);
 */
const expectObjectProps = (propMap) => (obj) => {
  // Dynamically import expect at runtime to avoid hard dependency
  const { expect } = require("bun:test");
  for (const [key, value] of Object.entries(propMap)) {
    expect(obj[key]).toBe(value);
  }
  return obj;
};

/**
 * Assert that a result array has expected values for a given property getter.
 * The most generic form - accepts any getter function.
 * Curried: first call with getter, returns assertion function.
 *
 * @param {Function} getter - (item) => value to extract from each item
 * @returns {Function} (result, expectedValues) => void
 *
 * @example
 * expectArrayProp(item => item.name)(result, ["Alpha", "Beta"]);
 * expectArrayProp(item => item.data.title)(result, ["Product 1", "Product 2"]);
 */
const expectArrayProp = (getter) => (result, expectedValues) => {
  const { expect } = require("bun:test");
  expect(result.length).toBe(expectedValues.length);
  expectedValues.forEach((value, i) => {
    const actual = getter(result[i]);
    if (value === undefined) {
      expect(actual).toBe(undefined);
    } else {
      expect(actual).toEqual(value);
    }
  });
};

/**
 * Assert that a result array has expected values for a top-level property.
 * Curried: first call with key name, returns assertion function.
 *
 * @param {string} key - The property key to check (e.g., "name", "template")
 * @returns {Function} (result, expectedValues) => void
 *
 * @example
 * expectProp("name")(result, ["Alpha", "Beta"]);
 * expectProp("template")(result, ["input.html", "textarea.html"]);
 */
const expectProp = (key) => expectArrayProp((item) => item[key]);

/**
 * Assert that a result array has expected data values for a given key.
 * Curried: first call with key name, returns assertion function.
 * For checking result[i].data[key] patterns.
 *
 * @param {string} key - The data key to check (e.g., "gallery", "categories")
 * @returns {Function} (result, expectedValues) => void
 *
 * @example
 * const expectGalleries = expectDataArray("gallery");
 * expectGalleries(result, [["img1.jpg"], undefined, ["img3.jpg"]]);
 */
const expectDataArray = (key) => expectArrayProp((item) => item.data[key]);

/**
 * Assert that errors contain expected conditions.
 * Curried: (conditions) => (errors) => void
 * Supports strings, arrays (any match), and predicate functions.
 *
 * @param {...(string|Array<string>|Function)} conditions - Conditions to check
 * @returns {Function} (errors) => void
 *
 * @example
 * expectErrorsInclude("❌", ["threshold", "Duplication"])(errors);
 * expectErrorsInclude("FAIL", (e) => e.includes("timeout"))(errors);
 */
const expectErrorsInclude =
  (...conditions) =>
  (errors) => {
    const { expect } = require("bun:test");
    for (const condition of conditions) {
      if (typeof condition === "function") {
        expect(errors.some(condition)).toBe(true);
      } else if (Array.isArray(condition)) {
        expect(errors.some((e) => condition.some((c) => e.includes(c)))).toBe(
          true,
        );
      } else {
        expect(errors.some((e) => e.includes(condition))).toBe(true);
      }
    }
  };

/**
 * Test helper that expects an async function to throw and returns the error.
 * Idiomatic replacement for try/catch in tests.
 *
 * @param {Function} asyncFn - Async function to call (returns promise)
 * @returns {Promise<Error>} The thrown error for further assertions
 *
 * @example
 * const error = await expectAsyncThrows(() => site.build());
 * expect(error.message).toContain("Build failed");
 * expect(error.stdout || error.stderr).toBeTruthy();
 */
const expectAsyncThrows = async (asyncFn) => {
  const { expect } = require("bun:test");
  let threwError = false;
  let error;
  try {
    await asyncFn();
  } catch (e) {
    threwError = true;
    error = e;
  }
  expect(threwError).toBe(true);
  return error;
};

export {
  expectObjectProps,
  expectArrayProp,
  expectProp,
  expectDataArray,
  expectErrorsInclude,
  expectAsyncThrows,
};
