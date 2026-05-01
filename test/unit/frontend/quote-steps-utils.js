/**
 * Quote steps test utilities and fixtures
 * Shared test helpers for quote-steps-progress.test.js
 */

import { expect } from "bun:test";

// Quote steps fixture data
const makeStep = (name, number) => ({ name, number });
const QUOTE_STEPS = [
  makeStep("Items", 1),
  makeStep("Event", 2),
  makeStep("Contact", 3),
  makeStep("Review", 4),
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
  indicatorTemplate,
  QUOTE_STEPS,
  QUOTE_STEPS_JSON,
  testIndicatorStates,
};
