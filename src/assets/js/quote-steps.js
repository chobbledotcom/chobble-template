// Quote form multi-step navigation
// Handles step transitions, validation, recap population, and progress indicator

import { onReady } from "#assets/on-ready.js";
import { filter, map, pipe, unique } from "#utils/array-utils.js";

// === Step Progress Indicator Functions ===

function renderIndicator(step, index, isLast) {
  const indicator = `<div class="quote-steps-indicator" data-step="${index}">
      <span class="step-name">${step.name}</span>
      <span class="step-number">${step.number}</span>
    </div>`;
  return isLast
    ? indicator
    : `${indicator}<div class="quote-steps-connector"></div>`;
}

function renderStepProgress(container, steps, completedSteps) {
  container.innerHTML = steps
    .map((step, i) => renderIndicator(step, i, i === steps.length - 1))
    .join("");
  updateStepProgress(container, completedSteps);
}

function updateStepProgress(container, completedSteps) {
  const indicators = container.querySelectorAll(".quote-steps-indicator");
  for (const [index, indicator] of indicators.entries()) {
    indicator.classList.toggle("active", index === completedSteps);
    indicator.classList.toggle("completed", index < completedSteps);
  }
}

function initStandaloneProgress() {
  const container = document.querySelector(
    ".quote-steps-progress:not(.quote-steps .quote-steps-progress)",
  );
  if (container === null) return;

  const dataScript = document.querySelector(".quote-steps-data");
  const steps = JSON.parse(dataScript.textContent);
  const completedSteps = parseInt(container.dataset.completedSteps, 10);
  renderStepProgress(container, steps, completedSteps);
}

// === Quote Step Form Functions ===

function getFieldLabel(fieldId) {
  const label = document.querySelector(`label[for="${fieldId}"]`);
  return label ? label.textContent.trim() : fieldId;
}

function getRadioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function getFieldDisplayValue(field) {
  if (field.type === "radio") return getRadioValue(field.name);
  if (field.tagName === "SELECT") {
    return field.options[field.selectedIndex]?.text || "";
  }
  return field.value;
}

function getRadioLabel(id) {
  const legend = document.querySelector(
    `fieldset:has(input[name="${id}"]) legend`,
  );
  return legend ? legend.textContent.trim() : id;
}

function buildRadioRecapItem(id) {
  const value = getRadioValue(id);
  return value === "" ? "" : `<dt>${getRadioLabel(id)}</dt><dd>${value}</dd>`;
}

function buildFieldRecapItem(id) {
  const field = document.getElementById(id);
  if (field === null) {
    const radioField = document.querySelector(`input[name="${id}"]`);
    return radioField ? buildRadioRecapItem(id) : "";
  }
  const value = getFieldDisplayValue(field);
  return value === "" ? "" : `<dt>${getFieldLabel(id)}</dt><dd>${value}</dd>`;
}

// Functional pipeline for extracting field IDs from an array of fields
// Radios use the name attribute as their ID, other fields use the id attribute
const extractFieldIds = pipe(
  map((field) => (field.type === "radio" ? field.name : field.id)),
  filter(Boolean), // Remove null/undefined/empty ids
  unique, // Remove duplicates
);

// Get field IDs from a DOM element (backward compatible wrapper)
function getStepFieldIds(stepEl) {
  const fields = [...stepEl.querySelectorAll("input, select, textarea")];
  return extractFieldIds(fields);
}

function populateRecap(steps) {
  const recapEvent = document.getElementById("recap-event");
  const recapContact = document.getElementById("recap-contact");
  if (!recapEvent || !recapContact) return;
  if (!steps || steps.length < 2) return;

  const eventFieldIds = getStepFieldIds(steps[0]);
  const contactFieldIds = getStepFieldIds(steps[1]);

  recapEvent.innerHTML = eventFieldIds.map(buildFieldRecapItem).join("");
  recapContact.innerHTML = contactFieldIds.map(buildFieldRecapItem).join("");
}

function getFieldWrapper(field) {
  // For radios, the wrapper is the fieldset
  if (field.type === "radio") {
    return field.closest("fieldset");
  }
  // For other fields, the wrapper is the parent label
  return field.closest("label");
}

function setFieldError(field, hasError) {
  const wrapper = getFieldWrapper(field);
  field.classList.toggle("field-error", hasError);
  if (wrapper) {
    wrapper.classList.toggle("field-error", hasError);
  }
}

function clearFieldError(field) {
  setFieldError(field, false);
}

function setupErrorClearingOnField(field) {
  const eventType = field.type === "radio" ? "change" : "input";
  field.addEventListener(eventType, () => clearFieldError(field), {
    once: true,
  });
}

function validateRadioGroup(name, stepEl) {
  const radios = stepEl.querySelectorAll(`input[name="${name}"]`);
  const checked = stepEl.querySelector(`input[name="${name}"]:checked`);
  const isRequired = radios[0]?.required;
  const isValid = !isRequired || checked !== null;
  if (!isValid && radios[0]) {
    setFieldError(radios[0], true);
    setupErrorClearingOnField(radios[0]);
  }
  return isValid;
}

function validateField(field, stepEl) {
  // Radio buttons need group validation
  if (field.type === "radio") {
    return validateRadioGroup(field.name, stepEl);
  }
  // Use HTML5 constraint validation (checks required, email format, patterns, etc.)
  const isValid = field.checkValidity();
  if (isValid === false) {
    setFieldError(field, true);
    setupErrorClearingOnField(field);
  }
  return isValid;
}

function validateStep(stepEl) {
  const requiredFields = [...stepEl.querySelectorAll("[required]")];
  const invalidFields = requiredFields.filter(
    (field) => !validateField(field, stepEl),
  );

  // Scroll to first invalid field
  if (invalidFields.length > 0) {
    const firstInvalid = invalidFields[0];
    const wrapper = getFieldWrapper(firstInvalid);
    const scrollTarget = wrapper || firstInvalid;
    scrollTarget.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return invalidFields.length === 0;
}

function updateButtons(prevBtn, nextBtn, submitBtn, currentStep, totalSteps) {
  prevBtn.style.display = currentStep === 0 ? "none" : "";
  nextBtn.style.display = currentStep === totalSteps - 1 ? "none" : "";
  submitBtn.style.display = currentStep === totalSteps - 1 ? "" : "none";
}

function getCurrentStep(container) {
  return parseInt(container.dataset.currentStep || "0", 10);
}

function initQuoteSteps() {
  const container = document.querySelector(".quote-steps");
  if (container === null) return;

  const steps = container.querySelectorAll(".quote-step");
  const progressContainer = container.querySelector(".quote-steps-progress");
  const dataScript = container.querySelector(".quote-steps-data");
  const prevBtn = container.querySelector(".quote-step-prev");
  const nextBtn = container.querySelector(".quote-step-next");
  const submitBtn = container.querySelector(".quote-step-submit");
  const stepsData = JSON.parse(dataScript.textContent);
  const baseCompletedSteps = parseInt(
    progressContainer.dataset.completedSteps,
    10,
  );
  const totalSteps = steps.length;

  renderStepProgress(progressContainer, stepsData, baseCompletedSteps);

  function updateUI() {
    const currentStep = getCurrentStep(container);
    for (const [index, step] of steps.entries()) {
      step.classList.toggle("active", index === currentStep);
    }
    updateStepProgress(progressContainer, baseCompletedSteps + currentStep);
    updateButtons(prevBtn, nextBtn, submitBtn, currentStep, totalSteps);
    if (currentStep === totalSteps - 1) populateRecap(steps);
  }

  function goToStep(newStep) {
    const currentStep = getCurrentStep(container);
    if (newStep < 0 || newStep >= totalSteps) return;
    if (newStep > currentStep && !validateStep(steps[currentStep])) return;
    container.dataset.currentStep = newStep;
    updateUI();
    container.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  prevBtn.addEventListener("click", () =>
    goToStep(getCurrentStep(container) - 1),
  );
  nextBtn.addEventListener("click", () =>
    goToStep(getCurrentStep(container) + 1),
  );

  // Set up click handlers for completed indicators
  progressContainer.addEventListener("click", (e) => {
    const indicator = e.target.closest(".quote-steps-indicator");
    if (indicator === null) return;
    const stepIndex = parseInt(indicator.dataset.step, 10);
    const formStep = stepIndex - baseCompletedSteps;
    if (formStep >= 0 && formStep < getCurrentStep(container)) {
      goToStep(formStep);
    }
  });

  updateUI();
}

onReady(initQuoteSteps);
onReady(initStandaloneProgress);

// Exports for testing
export {
  buildFieldRecapItem,
  buildRadioRecapItem,
  clearFieldError,
  getCurrentStep,
  getFieldDisplayValue,
  getFieldLabel,
  getFieldWrapper,
  getRadioLabel,
  getRadioValue,
  getStepFieldIds,
  initQuoteSteps,
  populateRecap,
  renderStepProgress,
  setFieldError,
  updateButtons,
  updateStepProgress,
  validateField,
  validateRadioGroup,
  validateStep,
};
