// Quote steps multi-form navigation tests
// Tests observable behavior through the public initQuoteSteps API

import { describe, expect, mock, test } from "bun:test";
import { initQuoteSteps } from "#public/cart/quote-steps.js";
import {
  indicatorTemplate,
  QUOTE_STEPS_JSON,
} from "#test/unit/frontend/quote-steps-utils.js";

/**
 * Create HTML for testing quote steps navigation
 */
const createQuoteStepsHtml = (options = {}) => {
  const currentStep = options.currentStep ?? 0;
  const step0Content =
    options.step0Content ?? '<input type="text" required value="filled" />';
  const step1Content =
    options.step1Content ?? '<input id="contact_name" type="text" />';
  const includeBackToItems = options.includeBackToItems ?? false;

  return `
    ${indicatorTemplate}
    <div class="quote-steps" data-current-step="${currentStep}">
      <div class="quote-steps-progress" data-completed-steps="1"></div>
      <script type="application/json" class="quote-steps-data">${QUOTE_STEPS_JSON}</script>
      <div class="quote-step${currentStep === 0 ? " active" : ""}" data-step="0">
        ${step0Content}
      </div>
      <div class="quote-step${currentStep === 1 ? " active" : ""}" data-step="1">
        ${step1Content}
      </div>
      <div class="quote-step${currentStep === 2 ? " active" : ""}" data-step="2">
        <dl id="recap-event"></dl>
        <dl id="recap-contact"></dl>
      </div>
      ${includeBackToItems ? '<button class="quote-step-back-to-items">Back to Items</button>' : ""}
      <button class="quote-step-prev">Back</button>
      <button class="quote-step-next">Next</button>
      <button class="quote-step-submit">Submit</button>
    </div>
  `;
};

/**
 * Initialize quote steps and return commonly-used elements
 */
const setupQuoteSteps = (options = {}) => {
  document.body.innerHTML = createQuoteStepsHtml(options);
  const container = document.querySelector(".quote-steps");
  container.scrollIntoView = mock(() => {});
  initQuoteSteps();
  return {
    container,
    steps: document.querySelectorAll(".quote-step"),
    prevBtn: document.querySelector(".quote-step-prev"),
    nextBtn: document.querySelector(".quote-step-next"),
    submitBtn: document.querySelector(".quote-step-submit"),
    backToItemsBtn: document.querySelector(".quote-step-back-to-items"),
    indicators: document.querySelectorAll(".quote-steps-progress li"),
  };
};

describe("quote-steps", () => {
  // ----------------------------------------
  // Initialization behavior
  // ----------------------------------------
  describe("initialization", () => {
    test("does nothing if no quote-steps container exists", () => {
      document.body.innerHTML = "<div>No steps here</div>";
      expect(() => initQuoteSteps()).not.toThrow();
    });

    test("renders step progress indicators", () => {
      const { indicators } = setupQuoteSteps();
      expect(indicators.length).toBe(4);
    });

    test("shows first step as active by default", () => {
      const { steps } = setupQuoteSteps();
      expect(steps[0].classList.contains("active")).toBe(true);
      expect(steps[1].classList.contains("active")).toBe(false);
    });
  });

  // ----------------------------------------
  // Button visibility behavior
  // ----------------------------------------
  describe("button visibility", () => {
    test("hides prev button on first step", () => {
      const { prevBtn } = setupQuoteSteps();
      expect(prevBtn.style.display).toBe("none");
    });

    test("shows next button on first step", () => {
      const { nextBtn } = setupQuoteSteps();
      expect(nextBtn.style.display).toBe("");
    });

    test("hides submit button on first step", () => {
      const { submitBtn } = setupQuoteSteps();
      expect(submitBtn.style.display).toBe("none");
    });

    test("shows prev button on middle step", () => {
      const { prevBtn, nextBtn } = setupQuoteSteps();
      nextBtn.click();
      expect(prevBtn.style.display).toBe("");
    });

    test("shows next button on middle step", () => {
      const { nextBtn } = setupQuoteSteps();
      nextBtn.click();
      expect(nextBtn.style.display).toBe("");
    });

    test("hides next button on last step", () => {
      const { nextBtn } = setupQuoteSteps();
      nextBtn.click(); // to step 1
      nextBtn.click(); // to step 2 (last)
      expect(nextBtn.style.display).toBe("none");
    });

    test("shows submit button on last step", () => {
      const { submitBtn } = setupQuoteSteps({ currentStep: 2 });
      expect(submitBtn.style.display).toBe("");
    });

    test("shows backToItems button on first step when present", () => {
      const { backToItemsBtn } = setupQuoteSteps({ includeBackToItems: true });
      expect(backToItemsBtn.style.display).toBe("");
    });

    test("hides backToItems button on other steps", () => {
      const { backToItemsBtn, nextBtn } = setupQuoteSteps({
        includeBackToItems: true,
      });
      nextBtn.click();
      expect(backToItemsBtn.style.display).toBe("none");
    });
  });

  // ----------------------------------------
  // Navigation behavior
  // ----------------------------------------
  describe("navigation", () => {
    test("next button advances to next step when validation passes", () => {
      const { container, nextBtn } = setupQuoteSteps();
      nextBtn.click();
      expect(container.dataset.currentStep).toBe("1");
    });

    test("prev button returns to previous step", () => {
      const { container, nextBtn, prevBtn } = setupQuoteSteps();
      nextBtn.click();
      expect(container.dataset.currentStep).toBe("1");
      prevBtn.click();
      expect(container.dataset.currentStep).toBe("0");
    });

    test("updates active class on step elements", () => {
      const { steps, nextBtn } = setupQuoteSteps();
      expect(steps[0].classList.contains("active")).toBe(true);
      nextBtn.click();
      expect(steps[0].classList.contains("active")).toBe(false);
      expect(steps[1].classList.contains("active")).toBe(true);
    });

    test("scrolls container into view after step change", () => {
      const { container, nextBtn } = setupQuoteSteps();
      nextBtn.click();
      expect(container.scrollIntoView).toHaveBeenCalled();
    });

    test("indicator click navigates to completed step", () => {
      const { container, nextBtn, indicators } = setupQuoteSteps();
      nextBtn.click(); // to step 1
      nextBtn.click(); // to step 2
      expect(container.dataset.currentStep).toBe("2");
      // Click first form step indicator (index 1, since index 0 is "Items" which is pre-completed)
      indicators[1].click();
      expect(container.dataset.currentStep).toBe("0");
    });

    test("indicator click does not navigate to future step", () => {
      const { container, indicators } = setupQuoteSteps();
      indicators[2].click(); // try to jump to step 2
      expect(container.dataset.currentStep).toBe("0");
    });

    test("does not advance past last step", () => {
      const { container, nextBtn } = setupQuoteSteps();
      nextBtn.click(); // step 1
      nextBtn.click(); // step 2 (last)
      nextBtn.click(); // should stay at 2
      expect(container.dataset.currentStep).toBe("2");
    });

    test("does not go before first step", () => {
      const { container, prevBtn } = setupQuoteSteps();
      prevBtn.click(); // should stay at 0
      expect(container.dataset.currentStep).toBe("0");
    });
  });

  // ----------------------------------------
  // Validation behavior
  // ----------------------------------------
  describe("validation", () => {
    test("blocks navigation when required text field is empty", () => {
      const { container, nextBtn } = setupQuoteSteps({
        step0Content: '<input type="text" required value="" />',
      });
      nextBtn.click();
      expect(container.dataset.currentStep).toBe("0");
    });

    test("allows navigation when required text field is filled", () => {
      const { container, nextBtn } = setupQuoteSteps({
        step0Content: '<input type="text" required value="filled" />',
      });
      nextBtn.click();
      expect(container.dataset.currentStep).toBe("1");
    });

    test("allows navigation when field is not required", () => {
      const { container, nextBtn } = setupQuoteSteps({
        step0Content: '<input type="text" value="" />',
      });
      nextBtn.click();
      expect(container.dataset.currentStep).toBe("1");
    });

    test("validates email format", () => {
      const { container, nextBtn } = setupQuoteSteps({
        step0Content: '<input type="email" required value="not-an-email" />',
      });
      nextBtn.click();
      expect(container.dataset.currentStep).toBe("0");
    });

    test("accepts valid email", () => {
      const { container, nextBtn } = setupQuoteSteps({
        step0Content:
          '<input type="email" required value="test@example.com" />',
      });
      nextBtn.click();
      expect(container.dataset.currentStep).toBe("1");
    });

    test("blocks navigation when required radio is unchecked", () => {
      const { container, nextBtn } = setupQuoteSteps({
        step0Content: `
          <fieldset>
            <legend>Choice</legend>
            <input type="radio" name="choice" value="A" required />
            <input type="radio" name="choice" value="B" />
          </fieldset>
        `,
      });
      nextBtn.click();
      expect(container.dataset.currentStep).toBe("0");
    });

    test("allows navigation when required radio is checked", () => {
      const { container, nextBtn } = setupQuoteSteps({
        step0Content: `
          <fieldset>
            <legend>Choice</legend>
            <input type="radio" name="choice" value="A" required checked />
            <input type="radio" name="choice" value="B" />
          </fieldset>
        `,
      });
      nextBtn.click();
      expect(container.dataset.currentStep).toBe("1");
    });

    test("allows navigation when radio is not required and unchecked", () => {
      const { container, nextBtn } = setupQuoteSteps({
        step0Content: `
          <fieldset>
            <legend>Choice</legend>
            <input type="radio" name="choice" value="A" />
            <input type="radio" name="choice" value="B" />
          </fieldset>
        `,
      });
      nextBtn.click();
      expect(container.dataset.currentStep).toBe("1");
    });

    test("validates multiple required fields", () => {
      const { container, nextBtn } = setupQuoteSteps({
        step0Content: `
          <input type="text" required value="filled" />
          <input type="email" required value="" />
        `,
      });
      nextBtn.click();
      expect(container.dataset.currentStep).toBe("0");
    });

    test("passes when all multiple required fields are valid", () => {
      const { container, nextBtn } = setupQuoteSteps({
        step0Content: `
          <input type="text" required value="filled" />
          <input type="email" required value="test@example.com" />
        `,
      });
      nextBtn.click();
      expect(container.dataset.currentStep).toBe("1");
    });
  });

  // ----------------------------------------
  // Error styling behavior
  // ----------------------------------------
  describe("error styling", () => {
    const INVALID_TEXT_INPUT =
      '<input id="test" type="text" required value="" />';

    // Setup that triggers validation error on a text input
    const triggerValidationError = () => {
      const { nextBtn } = setupQuoteSteps({ step0Content: INVALID_TEXT_INPUT });
      nextBtn.click();
      return document.getElementById("test");
    };

    test("adds error class to invalid field", () => {
      const field = triggerValidationError();
      expect(field.classList.contains("field-error")).toBe(true);
    });

    test("adds error class to field wrapper (label)", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content: `
          <label>
            Name
            <input id="test" type="text" required value="" />
          </label>
        `,
      });
      nextBtn.click();
      const wrapper = document.querySelector("label");
      expect(wrapper.classList.contains("field-error")).toBe(true);
    });

    test("adds error class to fieldset for invalid radio", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content: `
          <fieldset>
            <legend>Choice</legend>
            <input type="radio" name="choice" value="A" required />
          </fieldset>
        `,
      });
      nextBtn.click();
      const fieldset = document.querySelector("fieldset");
      expect(fieldset.classList.contains("field-error")).toBe(true);
    });

    test("clears error class on input event", () => {
      const field = triggerValidationError();
      expect(field.classList.contains("field-error")).toBe(true);

      field.value = "fixed";
      field.dispatchEvent(new Event("input"));
      expect(field.classList.contains("field-error")).toBe(false);
    });

    test("clears error class on radio change event", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content: `
          <fieldset>
            <legend>Choice</legend>
            <input type="radio" name="choice" value="A" required />
            <input type="radio" name="choice" value="B" />
          </fieldset>
        `,
      });
      nextBtn.click();
      const radio = document.querySelector('input[type="radio"]');
      expect(radio.classList.contains("field-error")).toBe(true);

      radio.checked = true;
      radio.dispatchEvent(new Event("change"));
      expect(radio.classList.contains("field-error")).toBe(false);
    });

    test("scrolls first invalid field into view", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content: `
          <label id="wrapper">
            Name
            <input id="test" type="text" required value="" />
          </label>
        `,
      });
      const wrapper = document.getElementById("wrapper");
      wrapper.scrollIntoView = mock(() => {});
      nextBtn.click();
      expect(wrapper.scrollIntoView).toHaveBeenCalled();
    });
  });

  // ----------------------------------------
  // Recap population behavior
  // ----------------------------------------
  describe("recap population", () => {
    test("populates recap with text field values on final step", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content: `
          <label for="event_date">Event Date</label>
          <input type="date" id="event_date" value="2025-06-15" />
        `,
        step1Content: `
          <label for="contact_name">Name</label>
          <input type="text" id="contact_name" value="Jane Doe" />
        `,
      });
      nextBtn.click(); // to step 1
      nextBtn.click(); // to step 2 (recap)

      const recapEvent = document.getElementById("recap-event");
      const recapContact = document.getElementById("recap-contact");
      expect(recapEvent.innerHTML).toContain("2025-06-15");
      expect(recapContact.innerHTML).toContain("Jane Doe");
    });

    test("populates recap with field labels", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content: `
          <label for="event_date">Event Date</label>
          <input type="date" id="event_date" value="2025-06-15" />
        `,
      });
      nextBtn.click();
      nextBtn.click();

      const recapEvent = document.getElementById("recap-event");
      expect(recapEvent.innerHTML).toContain("Event Date");
    });

    test("extracts label text without nested elements", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content: `
          <label for="event_type">
            Type of Event
            <select id="event_type">
              <option value="">Select</option>
              <option value="Wedding" selected>Wedding</option>
            </select>
          </label>
        `,
      });
      nextBtn.click();
      nextBtn.click();

      const recapEvent = document.getElementById("recap-event");
      expect(recapEvent.innerHTML).toContain("Type of Event");
      expect(recapEvent.innerHTML).not.toContain("<select");
    });

    test("shows select option text in recap", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content: `
          <label for="event_type">Type</label>
          <select id="event_type">
            <option value="">Select</option>
            <option value="wedding" selected>Wedding Celebration</option>
          </select>
        `,
      });
      nextBtn.click();
      nextBtn.click();

      const recapEvent = document.getElementById("recap-event");
      expect(recapEvent.innerHTML).toContain("Wedding Celebration");
    });

    test("populates recap with radio selection", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content: `
          <fieldset>
            <legend>Contact Preference</legend>
            <input type="radio" name="contact_pref" value="Email" checked />
            <input type="radio" name="contact_pref" value="Phone" />
          </fieldset>
        `,
      });
      nextBtn.click();
      nextBtn.click();

      const recapEvent = document.getElementById("recap-event");
      expect(recapEvent.innerHTML).toContain("Contact Preference");
      expect(recapEvent.innerHTML).toContain("Email");
    });

    test("omits empty fields from recap", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content: `
          <label for="notes">Notes</label>
          <input type="text" id="notes" value="" />
        `,
      });
      nextBtn.click();
      nextBtn.click();

      const recapEvent = document.getElementById("recap-event");
      expect(recapEvent.innerHTML).not.toContain("Notes");
    });

    test("omits unchecked radio groups from recap", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content: `
          <fieldset>
            <legend>Optional Choice</legend>
            <input type="radio" name="optional" value="A" />
            <input type="radio" name="optional" value="B" />
          </fieldset>
        `,
      });
      nextBtn.click();
      nextBtn.click();

      const recapEvent = document.getElementById("recap-event");
      expect(recapEvent.innerHTML).not.toContain("Optional Choice");
    });

    test("uses field id as label when no label element exists", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content:
          '<input type="text" id="orphan_field" value="test value" />',
      });
      nextBtn.click();
      nextBtn.click();

      const recapEvent = document.getElementById("recap-event");
      expect(recapEvent.innerHTML).toContain("orphan_field");
    });

    test("uses radio name as label when no legend exists", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content:
          '<input type="radio" name="orphan_radio" value="checked" checked />',
      });
      nextBtn.click();
      nextBtn.click();

      const recapEvent = document.getElementById("recap-event");
      expect(recapEvent.innerHTML).toContain("orphan_radio");
    });

    test("deduplicates radio inputs with same name", () => {
      const { nextBtn } = setupQuoteSteps({
        step0Content: `
          <fieldset>
            <legend>Choice</legend>
            <input type="radio" name="choice" value="A" />
            <input type="radio" name="choice" value="B" checked />
            <input type="radio" name="choice" value="C" />
          </fieldset>
        `,
      });
      nextBtn.click();
      nextBtn.click();

      const recapEvent = document.getElementById("recap-event");
      // Should only show "Choice" once with value "B"
      const choiceMatches = recapEvent.innerHTML.match(/Choice/g);
      expect(choiceMatches.length).toBe(1);
      expect(recapEvent.innerHTML).toContain("B");
    });
  });

  // ----------------------------------------
  // Step progress indicator behavior
  // ----------------------------------------
  describe("step progress", () => {
    test("updates progress indicator on navigation", () => {
      const { indicators, nextBtn } = setupQuoteSteps();
      // Initially first form step (index 1) should be current
      expect(indicators[1].getAttribute("aria-current")).toBe("step");

      nextBtn.click();
      // After advancing, second form step (index 2) should be current
      expect(indicators[2].getAttribute("aria-current")).toBe("step");
    });

    test("marks steps as completed when passed", () => {
      const { indicators, nextBtn } = setupQuoteSteps();
      nextBtn.click();
      // First form step (index 1) should now be completed
      expect(indicators[1].classList.contains("completed")).toBe(true);
    });
  });
});
