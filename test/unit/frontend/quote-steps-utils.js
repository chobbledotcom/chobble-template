/**
 * Quote steps test utilities and fixtures
 * Shared test helpers for quote-steps-progress.test.js
 */

import { expect } from "bun:test";

// Quote steps fixture data
const QUOTE_STEPS = [
  { name: "Items", number: 1 },
  { name: "Event", number: 2 },
  { name: "Contact", number: 3 },
  { name: "Review", number: 4 },
];

const QUOTE_STEPS_JSON = JSON.stringify(QUOTE_STEPS);

// Template element required by renderStepProgress
const indicatorTemplate = `
  <template id="quote-step-indicator-template">
    <li><span data-name="name"></span><span data-name="index"></span></li>
  </template>
`;

/**
 * Test helper to verify indicator completion/active states
 * @param {number} completedCount - Number of steps that should be marked as completed
 * @param {number} expectedAriaStep - Expected step with aria-current="step"
 */
const testIndicatorStates = (completedCount, expectedAriaStep) => {
  const indicators = [...document.querySelectorAll("li")];
  expect(indicators.map((el) => el.classList.contains("completed"))).toEqual(
    Array.from({ length: 4 }, (_, i) => i < completedCount),
  );
  expect(indicators.map((el) => el.getAttribute("aria-current"))).toEqual(
    Array.from({ length: 4 }, (_, i) =>
      i === expectedAriaStep ? "step" : "false",
    ),
  );
};

export {
  QUOTE_STEPS,
  QUOTE_STEPS_JSON,
  indicatorTemplate,
  testIndicatorStates,
};
