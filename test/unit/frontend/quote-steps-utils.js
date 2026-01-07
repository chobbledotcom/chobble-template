/**
 * Quote steps test utilities and fixtures
 * Shared test helpers for quote-steps.test.js and quote-steps-progress.test.js
 */

import { expect } from "bun:test";
import { initQuoteSteps, validateField } from "#public/cart/quote-steps.js";

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
 * Create HTML for testing quote steps navigation
 * @param {Object} options - Configuration for the test HTML
 * @param {number} options.currentStep - Initial step (0-2)
 * @param {string} options.inputValue - Value for the first step input
 * @param {boolean} options.inputRequired - Whether input is required
 * @returns {string} HTML string for quote steps
 */
const createQuoteStepsHtml = (options = {}) => {
  const currentStep = options.currentStep ?? 0;
  const inputValue = options.inputValue ?? "filled";
  const inputRequired = options.inputRequired !== false;
  return `
    ${indicatorTemplate}
    <div class="quote-steps" data-current-step="${currentStep}">
      <div class="quote-steps-progress" data-completed-steps="1"></div>
      <script type="application/json" class="quote-steps-data">${QUOTE_STEPS_JSON}</script>
      <div class="quote-step${currentStep === 0 ? " active" : ""}" data-step="0">
        <input type="text" ${inputRequired ? "required" : ""} value="${inputValue}" />
      </div>
      <div class="quote-step${currentStep === 1 ? " active" : ""}" data-step="1">Step 2</div>
      <div class="quote-step${currentStep === 2 ? " active" : ""}" data-step="2">
        <dl id="recap-event"></dl>
        <dl id="recap-contact"></dl>
      </div>
      <button class="quote-step-prev">Back</button>
      <button class="quote-step-next">Next</button>
      <button class="quote-step-submit">Submit</button>
    </div>
  `;
};

/**
 * Test helper to verify next button advances to expected step
 * @param {Object} setupOptions - Options to pass to createQuoteStepsHtml
 * @param {string} expectedStep - Expected current step after click
 */
const testNextButtonStep = (setupOptions, expectedStep) => {
  document.body.innerHTML = createQuoteStepsHtml(setupOptions);
  initQuoteSteps();
  const nextBtn = document.querySelector(".quote-step-next");
  nextBtn.click();
  const container = document.querySelector(".quote-steps");
  expect(container.dataset.currentStep).toBe(expectedStep);
};

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

/**
 * Test validateField with a given DOM setup
 * @param {string} inputHtml - HTML content inside the .step div
 * @param {boolean} expected - Expected return value
 */
const testValidateFieldWithHtml = (inputHtml, expected) => {
  document.body.innerHTML = `
    <div class="step">
      ${inputHtml}
    </div>
  `;
  const field = document.getElementById("test");
  const stepEl = document.querySelector(".step");
  expect(validateField(field, stepEl)).toBe(expected);
};

export {
  QUOTE_STEPS,
  QUOTE_STEPS_JSON,
  indicatorTemplate,
  createQuoteStepsHtml,
  testNextButtonStep,
  testIndicatorStates,
  testValidateFieldWithHtml,
};
