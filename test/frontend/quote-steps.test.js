// Quote steps multi-form navigation tests
// Tests the production quote-steps.js functions directly

import { describe, expect, test } from "bun:test";
import {
  buildFieldRecapItem,
  buildRadioRecapItem,
  getCurrentStep,
  getFieldDisplayValue,
  getFieldLabel,
  getRadioLabel,
  getRadioValue,
  initQuoteSteps,
  populateRecap,
  updateButtons,
  updateIndicators,
  validateField,
  validateRadioField,
  validateStep,
} from "#assets/quote-steps.js";

describe("quote-steps", () => {
  // ----------------------------------------
  // getFieldLabel Tests (with DOM)
  // ----------------------------------------
  test("getFieldLabel returns label text for field", () => {
    document.body.innerHTML = `
      <label for="name">Your Name</label>
      <input id="name" />
    `;
    expect(getFieldLabel("name")).toBe("Your Name");
  });

  test("getFieldLabel returns fieldId when no label exists", () => {
    document.body.innerHTML = '<input id="orphan" />';
    expect(getFieldLabel("orphan")).toBe("orphan");
  });

  // ----------------------------------------
  // getRadioValue Tests (with DOM)
  // ----------------------------------------
  test("getRadioValue returns empty string when nothing checked", () => {
    document.body.innerHTML = `
      <input type="radio" name="pref" value="A" />
      <input type="radio" name="pref" value="B" />
    `;
    expect(getRadioValue("pref")).toBe("");
  });

  test("getRadioValue returns checked radio value", () => {
    document.body.innerHTML = `
      <input type="radio" name="pref" value="A" />
      <input type="radio" name="pref" value="B" checked />
    `;
    expect(getRadioValue("pref")).toBe("B");
  });

  // ----------------------------------------
  // getRadioLabel Tests (with DOM)
  // ----------------------------------------
  test("getRadioLabel returns legend text from fieldset", () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Contact Preference</legend>
        <input type="radio" name="contact" value="Email" />
      </fieldset>
    `;
    expect(getRadioLabel("contact")).toBe("Contact Preference");
  });

  test("getRadioLabel returns id when no fieldset legend", () => {
    document.body.innerHTML = '<input type="radio" name="orphan" />';
    expect(getRadioLabel("orphan")).toBe("orphan");
  });

  // ----------------------------------------
  // buildRadioRecapItem Tests (with DOM)
  // ----------------------------------------
  test("buildRadioRecapItem returns empty for unchecked radio", () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Preference</legend>
        <input type="radio" name="pref" value="A" />
      </fieldset>
    `;
    expect(buildRadioRecapItem("pref")).toBe("");
  });

  test("buildRadioRecapItem builds dt/dd for checked radio", () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Preference</legend>
        <input type="radio" name="pref" value="Email" checked />
      </fieldset>
    `;
    const result = buildRadioRecapItem("pref");
    expect(result).toContain("<dt>");
    expect(result).toContain("Preference");
    expect(result).toContain("<dd>");
    expect(result).toContain("Email");
  });

  // ----------------------------------------
  // validateField Tests (with DOM)
  // ----------------------------------------
  test("validateField returns true for filled field", () => {
    document.body.innerHTML = `
      <div class="step">
        <input id="test" type="text" value="filled" />
      </div>
    `;
    const field = document.getElementById("test");
    const stepEl = document.querySelector(".step");
    expect(validateField(field, stepEl)).toBe(true);
  });

  test("validateField returns false for empty field", () => {
    document.body.innerHTML = `
      <div class="step">
        <input id="test" type="text" value="" />
      </div>
    `;
    const field = document.getElementById("test");
    const stepEl = document.querySelector(".step");
    expect(validateField(field, stepEl)).toBe(false);
  });

  test("validateField calls validateRadioField for radio type", () => {
    document.body.innerHTML = `
      <div class="step">
        <input type="radio" name="pref" value="A" checked />
      </div>
    `;
    const field = document.querySelector("input[type=radio]");
    field.value = "A"; // Set a value so it passes the first check
    const stepEl = document.querySelector(".step");
    expect(validateField(field, stepEl)).toBe(true);
  });

  // ----------------------------------------
  // validateRadioField Tests (with DOM)
  // ----------------------------------------
  test("validateRadioField returns true when radio is checked", () => {
    document.body.innerHTML = `
      <div class="step">
        <input type="radio" name="pref" value="A" checked />
      </div>
    `;
    const field = document.querySelector("input[type=radio]");
    const stepEl = document.querySelector(".step");
    expect(validateRadioField(field, stepEl)).toBe(true);
  });

  test("validateRadioField returns false when radio not checked", () => {
    document.body.innerHTML = `
      <div class="step">
        <input type="radio" name="pref" value="A" />
      </div>
    `;
    const field = document.querySelector("input[type=radio]");
    const stepEl = document.querySelector(".step");
    expect(validateRadioField(field, stepEl)).toBe(false);
  });

  // ----------------------------------------
  // getCurrentStep Tests
  // ----------------------------------------
  test("getCurrentStep returns 0 when dataset has no currentStep", () => {
    const container = { dataset: {} };
    expect(getCurrentStep(container)).toBe(0);
  });

  test("getCurrentStep returns 0 when currentStep is empty string", () => {
    const container = { dataset: { currentStep: "" } };
    expect(getCurrentStep(container)).toBe(0);
  });

  test("getCurrentStep parses numeric string from dataset", () => {
    const container = { dataset: { currentStep: "2" } };
    expect(getCurrentStep(container)).toBe(2);
  });

  test("getCurrentStep handles string '0' correctly", () => {
    const container = { dataset: { currentStep: "0" } };
    expect(getCurrentStep(container)).toBe(0);
  });

  // ----------------------------------------
  // updateButtons Tests
  // ----------------------------------------
  test("updateButtons hides prev on first step", () => {
    const prevBtn = { style: {} };
    const nextBtn = { style: {} };
    const submitBtn = { style: {} };
    updateButtons(prevBtn, nextBtn, submitBtn, 0, 3);
    expect(prevBtn.style.display).toBe("none");
    expect(nextBtn.style.display).toBe("");
    expect(submitBtn.style.display).toBe("none");
  });

  test("updateButtons shows both nav buttons on middle step", () => {
    const prevBtn = { style: {} };
    const nextBtn = { style: {} };
    const submitBtn = { style: {} };
    updateButtons(prevBtn, nextBtn, submitBtn, 1, 3);
    expect(prevBtn.style.display).toBe("");
    expect(nextBtn.style.display).toBe("");
    expect(submitBtn.style.display).toBe("none");
  });

  test("updateButtons shows submit on last step", () => {
    const prevBtn = { style: {} };
    const nextBtn = { style: {} };
    const submitBtn = { style: {} };
    updateButtons(prevBtn, nextBtn, submitBtn, 2, 3);
    expect(prevBtn.style.display).toBe("");
    expect(nextBtn.style.display).toBe("none");
    expect(submitBtn.style.display).toBe("");
  });

  test("updateButtons handles single step form", () => {
    const prevBtn = { style: {} };
    const nextBtn = { style: {} };
    const submitBtn = { style: {} };
    updateButtons(prevBtn, nextBtn, submitBtn, 0, 1);
    expect(prevBtn.style.display).toBe("none");
    expect(nextBtn.style.display).toBe("none");
    expect(submitBtn.style.display).toBe("");
  });

  // ----------------------------------------
  // updateIndicators Tests (with DOM)
  // ----------------------------------------
  test("updateIndicators sets active class on current step", () => {
    document.body.innerHTML = `
      <div class="indicator"></div>
      <div class="indicator"></div>
      <div class="indicator"></div>
    `;
    const indicators = document.querySelectorAll(".indicator");
    updateIndicators(indicators, 1);
    expect(indicators[0].classList.contains("active")).toBe(false);
    expect(indicators[1].classList.contains("active")).toBe(true);
    expect(indicators[2].classList.contains("active")).toBe(false);
  });

  test("updateIndicators sets completed class on previous steps", () => {
    document.body.innerHTML = `
      <div class="indicator"></div>
      <div class="indicator"></div>
      <div class="indicator"></div>
    `;
    const indicators = document.querySelectorAll(".indicator");
    updateIndicators(indicators, 2);
    expect(indicators[0].classList.contains("completed")).toBe(true);
    expect(indicators[1].classList.contains("completed")).toBe(true);
    expect(indicators[2].classList.contains("completed")).toBe(false);
  });

  // ----------------------------------------
  // getFieldDisplayValue Tests
  // ----------------------------------------
  test("getFieldDisplayValue returns value for text input", () => {
    const field = { type: "text", value: "Hello", tagName: "INPUT" };
    expect(getFieldDisplayValue(field)).toBe("Hello");
  });

  test("getFieldDisplayValue returns empty string for empty input", () => {
    const field = { type: "text", value: "", tagName: "INPUT" };
    expect(getFieldDisplayValue(field)).toBe("");
  });

  test("getFieldDisplayValue returns selected option text for select", () => {
    const field = {
      tagName: "SELECT",
      selectedIndex: 1,
      options: [{ text: "Choose..." }, { text: "Wedding" }],
    };
    expect(getFieldDisplayValue(field)).toBe("Wedding");
  });

  test("getFieldDisplayValue returns empty for select with no selection", () => {
    const field = {
      tagName: "SELECT",
      selectedIndex: 0,
      options: [],
    };
    expect(getFieldDisplayValue(field)).toBe("");
  });

  test("getFieldDisplayValue handles radio type by calling getRadioValue", () => {
    document.body.innerHTML = `
      <input type="radio" name="test" value="RadioValue" checked />
    `;
    const field = { type: "radio", name: "test", tagName: "INPUT" };
    expect(getFieldDisplayValue(field)).toBe("RadioValue");
  });

  // ----------------------------------------
  // validateStep Tests (with DOM)
  // ----------------------------------------
  test("validateStep returns true when no required fields", () => {
    document.body.innerHTML = '<div class="step"><input type="text" /></div>';
    const stepEl = document.querySelector(".step");
    expect(validateStep(stepEl)).toBe(true);
  });

  test("validateStep returns true when required fields are filled", () => {
    document.body.innerHTML = `
      <div class="step">
        <input type="text" required value="filled" />
      </div>
    `;
    const stepEl = document.querySelector(".step");
    expect(validateStep(stepEl)).toBe(true);
  });

  test("validateStep returns false when required field is empty", () => {
    document.body.innerHTML = `
      <div class="step">
        <input type="text" required value="" />
      </div>
    `;
    const stepEl = document.querySelector(".step");
    expect(validateStep(stepEl)).toBe(false);
  });

  test("validateStep validates multiple required fields", () => {
    document.body.innerHTML = `
      <div class="step">
        <input type="text" required value="filled" />
        <input type="email" required value="test@test.com" />
      </div>
    `;
    const stepEl = document.querySelector(".step");
    expect(validateStep(stepEl)).toBe(true);
  });

  test("validateStep fails if any required field is empty", () => {
    document.body.innerHTML = `
      <div class="step">
        <input type="text" required value="filled" />
        <input type="email" required value="" />
      </div>
    `;
    const stepEl = document.querySelector(".step");
    expect(validateStep(stepEl)).toBe(false);
  });

  // ----------------------------------------
  // buildFieldRecapItem Tests (with DOM)
  // ----------------------------------------
  test("buildFieldRecapItem returns empty string for missing field", () => {
    document.body.innerHTML = "";
    expect(buildFieldRecapItem("nonexistent")).toBe("");
  });

  test("buildFieldRecapItem returns empty string for empty value", () => {
    document.body.innerHTML = `
      <label for="name">Name</label>
      <input type="text" id="name" value="" />
    `;
    expect(buildFieldRecapItem("name")).toBe("");
  });

  test("buildFieldRecapItem builds dt/dd for filled field", () => {
    document.body.innerHTML = `
      <label for="name">Your Name</label>
      <input type="text" id="name" value="John Doe" />
    `;
    const result = buildFieldRecapItem("name");
    expect(result).toContain("<dt>");
    expect(result).toContain("Your Name");
    expect(result).toContain("<dd>");
    expect(result).toContain("John Doe");
  });

  test("buildFieldRecapItem works with select fields", () => {
    document.body.innerHTML = `
      <label for="event_type">Event Type</label>
      <select id="event_type">
        <option value="">Choose...</option>
        <option value="wedding" selected>Wedding</option>
      </select>
    `;
    const result = buildFieldRecapItem("event_type");
    expect(result).toContain("Event Type");
    expect(result).toContain("Wedding");
  });

  test("buildFieldRecapItem handles radio field via buildRadioRecapItem", () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Contact Method</legend>
        <input type="radio" name="contact_preference" value="Email" checked />
      </fieldset>
    `;
    const result = buildFieldRecapItem("contact_preference");
    expect(result).toContain("Contact Method");
    expect(result).toContain("Email");
  });

  // ----------------------------------------
  // populateRecap Tests (with DOM)
  // ----------------------------------------
  test("populateRecap does nothing if recap elements missing", () => {
    document.body.innerHTML = "";
    expect(() => populateRecap()).not.toThrow();
  });

  test("populateRecap fills recap sections with field values", () => {
    document.body.innerHTML = `
      <label for="event_start_date">Start Date</label>
      <input type="date" id="event_start_date" value="2025-06-15" />
      <label for="name">Name</label>
      <input type="text" id="name" value="Jane Doe" />
      <dl id="recap-event"></dl>
      <dl id="recap-contact"></dl>
    `;
    populateRecap();
    const recapEvent = document.getElementById("recap-event");
    const recapContact = document.getElementById("recap-contact");
    expect(recapEvent.innerHTML).toContain("2025-06-15");
    expect(recapContact.innerHTML).toContain("Jane Doe");
  });

  // ----------------------------------------
  // initQuoteSteps Tests (with DOM)
  // ----------------------------------------
  test("initQuoteSteps does nothing if no quote-steps container", () => {
    document.body.innerHTML = "<div>No steps here</div>";
    expect(() => initQuoteSteps()).not.toThrow();
  });

  test("initQuoteSteps does nothing if required elements missing", () => {
    document.body.innerHTML = '<div class="quote-steps"></div>';
    expect(() => initQuoteSteps()).not.toThrow();
  });

  test("initQuoteSteps sets up navigation on valid container", () => {
    document.body.innerHTML = `
      <div class="quote-steps" data-current-step="0">
        <div class="quote-step active" data-step="0">Step 1</div>
        <div class="quote-step" data-step="1">Step 2</div>
        <button class="quote-step-prev">Back</button>
        <button class="quote-step-next">Next</button>
        <button class="quote-step-submit">Submit</button>
      </div>
    `;
    initQuoteSteps();
    const prevBtn = document.querySelector(".quote-step-prev");
    expect(prevBtn.style.display).toBe("none");
  });

  test("initQuoteSteps shows submit on last step", () => {
    document.body.innerHTML = `
      <div class="quote-steps" data-current-step="1">
        <div class="quote-step" data-step="0">Step 1</div>
        <div class="quote-step active" data-step="1">Step 2</div>
        <button class="quote-step-prev">Back</button>
        <button class="quote-step-next">Next</button>
        <button class="quote-step-submit">Submit</button>
      </div>
    `;
    initQuoteSteps();
    const submitBtn = document.querySelector(".quote-step-submit");
    expect(submitBtn.style.display).toBe("");
  });
});
