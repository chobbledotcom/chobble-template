// Quote steps multi-form navigation tests
// Tests the production quote-steps.js functions directly

import { describe, expect, mock, test } from "bun:test";
import {
  buildRadioRecapItem,
  clearFieldError,
  getCurrentStep,
  getFieldDisplayValue,
  getFieldLabel,
  getFieldWrapper,
  getRadioLabel,
  getRadioValue,
  initQuoteSteps,
  populateRecap,
  setFieldError,
  updateButtons,
  validateField,
  validateRadioGroup,
  validateStep,
} from "#public/cart/quote-steps.js";
import {
  createQuoteStepsHtml,
  testNextButtonStep,
  testValidateFieldWithHtml,
} from "#test/unit/frontend/quote-steps-utils.js";

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
  // getFieldWrapper Tests (with DOM)
  // ----------------------------------------
  test("getFieldWrapper returns parent label for input", () => {
    document.body.innerHTML = `
      <label>
        Name
        <input id="name" type="text" />
      </label>
    `;
    const field = document.getElementById("name");
    const wrapper = getFieldWrapper(field);
    expect(wrapper.tagName).toBe("LABEL");
  });

  test("getFieldWrapper returns fieldset for radio", () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Preference</legend>
        <input type="radio" name="pref" value="A" />
      </fieldset>
    `;
    const field = document.querySelector("input[type=radio]");
    const wrapper = getFieldWrapper(field);
    expect(wrapper.tagName).toBe("FIELDSET");
  });

  test("getFieldWrapper returns null when no wrapper", () => {
    document.body.innerHTML = '<input id="orphan" type="text" />';
    const field = document.getElementById("orphan");
    const wrapper = getFieldWrapper(field);
    expect(wrapper).toBe(null);
  });

  // ----------------------------------------
  // setFieldError / clearFieldError Tests (with DOM)
  // ----------------------------------------
  test("setFieldError adds error class to field", () => {
    document.body.innerHTML = '<input id="test" type="text" />';
    const field = document.getElementById("test");
    setFieldError(field, true);
    expect(field.classList.contains("field-error")).toBe(true);
  });

  test("setFieldError adds error class to wrapper", () => {
    document.body.innerHTML = `
      <label>
        Name
        <input id="test" type="text" />
      </label>
    `;
    const field = document.getElementById("test");
    const wrapper = field.closest("label");
    setFieldError(field, true);
    expect(wrapper.classList.contains("field-error")).toBe(true);
  });

  test("clearFieldError removes error class", () => {
    document.body.innerHTML = `
      <label class="field-error">
        Name
        <input id="test" type="text" class="field-error" />
      </label>
    `;
    const field = document.getElementById("test");
    const wrapper = field.closest("label");
    clearFieldError(field);
    expect(field.classList.contains("field-error")).toBe(false);
    expect(wrapper.classList.contains("field-error")).toBe(false);
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
  test("validateField returns true for valid field", () => {
    testValidateFieldWithHtml(
      '<input id="test" type="text" required value="filled" />',
      true,
    );
  });

  test("validateField returns false for empty required field", () => {
    testValidateFieldWithHtml(
      '<input id="test" type="text" required value="" />',
      false,
    );
  });

  test("validateField returns true for empty non-required field", () => {
    testValidateFieldWithHtml('<input id="test" type="text" value="" />', true);
  });

  test("validateField validates email format", () => {
    testValidateFieldWithHtml(
      '<input id="test" type="email" required value="invalid-email" />',
      false,
    );
  });

  test("validateField returns true for valid email", () => {
    testValidateFieldWithHtml(
      '<input id="test" type="email" required value="test@example.com" />',
      true,
    );
  });

  test("validateField delegates to validateRadioGroup for radio type", () => {
    document.body.innerHTML = `
      <div class="step">
        <input type="radio" name="pref" value="A" checked />
      </div>
    `;
    const field = document.querySelector("input[type=radio]");
    const stepEl = document.querySelector(".step");
    expect(validateField(field, stepEl)).toBe(true);
  });

  test("validateField adds error class on invalid field", () => {
    document.body.innerHTML = `
      <div class="step">
        <label>
          Name
          <input id="test" type="text" required value="" />
        </label>
      </div>
    `;
    const field = document.getElementById("test");
    const stepEl = document.querySelector(".step");
    validateField(field, stepEl);
    expect(field.classList.contains("field-error")).toBe(true);
  });

  // ----------------------------------------
  // validateRadioGroup Tests (with DOM)
  // ----------------------------------------
  test("validateRadioGroup returns true when required radio is checked", () => {
    document.body.innerHTML = `
      <div class="step">
        <input type="radio" name="pref" value="A" required checked />
      </div>
    `;
    const stepEl = document.querySelector(".step");
    expect(validateRadioGroup("pref", stepEl)).toBe(true);
  });

  test("validateRadioGroup returns false when required radio not checked", () => {
    document.body.innerHTML = `
      <div class="step">
        <input type="radio" name="pref" value="A" required />
        <input type="radio" name="pref" value="B" />
      </div>
    `;
    const stepEl = document.querySelector(".step");
    expect(validateRadioGroup("pref", stepEl)).toBe(false);
  });

  test("validateRadioGroup returns true when non-required radio not checked", () => {
    document.body.innerHTML = `
      <div class="step">
        <input type="radio" name="pref" value="A" />
        <input type="radio" name="pref" value="B" />
      </div>
    `;
    const stepEl = document.querySelector(".step");
    expect(validateRadioGroup("pref", stepEl)).toBe(true);
  });

  // ----------------------------------------
  // getCurrentStep Tests
  // ----------------------------------------
  test("getCurrentStep returns 0 when no quote-steps container exists", () => {
    document.body.innerHTML = "<div>No steps</div>";
    expect(getCurrentStep()).toBe(0);
  });

  test("getCurrentStep returns 0 when dataset has no currentStep", () => {
    document.body.innerHTML = '<div class="quote-steps"></div>';
    expect(getCurrentStep()).toBe(0);
  });

  test("getCurrentStep returns 0 when currentStep is empty string", () => {
    document.body.innerHTML =
      '<div class="quote-steps" data-current-step=""></div>';
    expect(getCurrentStep()).toBe(0);
  });

  test("getCurrentStep parses numeric string from dataset", () => {
    document.body.innerHTML =
      '<div class="quote-steps" data-current-step="2"></div>';
    expect(getCurrentStep()).toBe(2);
  });

  test("getCurrentStep handles string '0' correctly", () => {
    document.body.innerHTML =
      '<div class="quote-steps" data-current-step="0"></div>';
    expect(getCurrentStep()).toBe(0);
  });

  // ----------------------------------------
  // updateButtons Tests (data-driven)
  // ----------------------------------------
  const createMockButtons = () => ({
    backToItems: { style: {} },
    prev: { style: {} },
    next: { style: {} },
    submit: { style: {} },
  });

  const updateButtonsCases = [
    {
      name: "hides prev and shows backToItems on first step",
      step: 0,
      total: 3,
      backToItems: "",
      prev: "none",
      next: "",
      submit: "none",
    },
    {
      name: "shows both nav and hides backToItems on middle step",
      step: 1,
      total: 3,
      backToItems: "none",
      prev: "",
      next: "",
      submit: "none",
    },
    {
      name: "shows submit on last step",
      step: 2,
      total: 3,
      backToItems: "none",
      prev: "",
      next: "none",
      submit: "",
    },
    {
      name: "handles single step form",
      step: 0,
      total: 1,
      backToItems: "",
      prev: "none",
      next: "none",
      submit: "",
    },
  ];

  for (const {
    name,
    step,
    total,
    backToItems,
    prev,
    next,
    submit,
  } of updateButtonsCases) {
    test(`updateButtons ${name}`, () => {
      const btns = createMockButtons();
      updateButtons(
        btns.backToItems,
        btns.prev,
        btns.next,
        btns.submit,
        step,
        total,
      );
      expect(btns.backToItems.style.display).toBe(backToItems);
      expect(btns.prev.style.display).toBe(prev);
      expect(btns.next.style.display).toBe(next);
      expect(btns.submit.style.display).toBe(submit);
    });
  }

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

  test("validateStep fails on invalid email format", () => {
    document.body.innerHTML = `
      <div class="step">
        <input type="email" required value="not-an-email" />
      </div>
    `;
    const stepEl = document.querySelector(".step");
    expect(validateStep(stepEl)).toBe(false);
  });

  // ----------------------------------------
  // populateRecap Tests (with DOM)
  // ----------------------------------------
  // Note: We trust templates to always include recap elements and pass valid steps
  // No tests for missing elements - that would be a template/caller bug

  test("populateRecap fills recap sections from step fields", () => {
    document.body.innerHTML = `
      <div class="step" data-step="0">
        <label for="start_date">Start Date</label>
        <input type="date" id="start_date" value="2025-06-15" />
      </div>
      <div class="step" data-step="1">
        <label for="name">Name</label>
        <input type="text" id="name" value="Jane Doe" />
      </div>
      <dl id="recap-event"></dl>
      <dl id="recap-contact"></dl>
    `;
    const steps = document.querySelectorAll(".step");
    populateRecap(steps);
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

  // Note: We trust templates to always include all required child elements
  // No test for missing child elements - that would be a template bug

  test("initQuoteSteps sets up navigation on valid container", () => {
    document.body.innerHTML = createQuoteStepsHtml();
    initQuoteSteps();
    const prevBtn = document.querySelector(".quote-step-prev");
    expect(prevBtn.style.display).toBe("none");
  });

  test("initQuoteSteps shows submit on last step", () => {
    document.body.innerHTML = createQuoteStepsHtml({ currentStep: 2 });
    initQuoteSteps();
    const submitBtn = document.querySelector(".quote-step-submit");
    expect(submitBtn.style.display).toBe("");
  });

  test("initQuoteSteps validates before advancing to next step", () => {
    testNextButtonStep({ inputValue: "" }, "0");
  });

  test("initQuoteSteps advances when validation passes", () => {
    testNextButtonStep({}, "1");
  });

  test("initQuoteSteps scrolls container into view after step change", () => {
    document.body.innerHTML = createQuoteStepsHtml();
    const container = document.querySelector(".quote-steps");
    container.scrollIntoView = mock(() => {});
    initQuoteSteps();
    const nextBtn = document.querySelector(".quote-step-next");
    nextBtn.click();
    expect(container.scrollIntoView).toHaveBeenCalled();
  });

  // Helper for initQuoteSteps tests that need navigation
  const setupQuoteStepsNav = () => {
    document.body.innerHTML = createQuoteStepsHtml();
    const container = document.querySelector(".quote-steps");
    container.scrollIntoView = () => {};
    initQuoteSteps();
    return {
      container,
      nextBtn: document.querySelector(".quote-step-next"),
      prevBtn: document.querySelector(".quote-step-prev"),
      indicators: document.querySelectorAll(".quote-steps-progress li"),
    };
  };

  test("initQuoteSteps sets up indicator click handlers", () => {
    const { container, nextBtn, indicators } = setupQuoteStepsNav();
    nextBtn.click();
    nextBtn.click();
    expect(container.dataset.currentStep).toBe("2");
    indicators[1].click();
    expect(container.dataset.currentStep).toBe("0");
  });

  test("initQuoteSteps indicator click only navigates to completed steps", () => {
    const { container, indicators } = setupQuoteStepsNav();
    indicators[2].click();
    expect(container.dataset.currentStep).toBe("0");
  });

  test("initQuoteSteps prev button navigates back", () => {
    const { container, nextBtn, prevBtn } = setupQuoteStepsNav();
    nextBtn.click();
    expect(container.dataset.currentStep).toBe("1");
    prevBtn.click();
    expect(container.dataset.currentStep).toBe("0");
  });
});
