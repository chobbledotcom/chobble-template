import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";

const INCLUDES_DIR = join(ROOT_DIR, "src/_includes");

/**
 * Creates standard tests for an order data module (e.g. categoryOrder).
 * @param {object} opts
 * @param {Array<string>} opts.order - The exported order array
 * @param {Function} opts.getOrder - The getXOrder function
 * @param {string} opts.name - Display name (e.g. "categoryOrder")
 * @param {Array<string>} opts.sampleItems - Two sample include paths for custom order test
 */
const defineOrderTests = ({ order, getOrder, name, sampleItems }) => {
  test(`${name} default include files all exist`, () => {
    for (const file of order) {
      expect(existsSync(join(INCLUDES_DIR, file))).toBe(true);
    }
  });

  test(`${name} custom config overrides defaults`, () => {
    expect(getOrder(sampleItems)).toEqual(sampleItems);
  });

  test(`${name} empty config falls back to defaults`, () => {
    expect(getOrder([])).toEqual(order);
  });

  test(`${name} single-element config is accepted`, () => {
    const single = [sampleItems[0]];
    expect(getOrder(single)).toEqual(single);
  });
};

export { defineOrderTests };
