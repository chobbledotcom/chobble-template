// Quote form multi-step navigation
// Handles step transitions, validation, and recap population

import { onReady } from "#assets/on-ready.js";

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
  if (!value) return "";
  return `<dt>${getRadioLabel(id)}</dt><dd>${value}</dd>`;
}

function buildFieldRecapItem(id) {
  const field = document.getElementById(id);
  if (!field) {
    const radioField = document.querySelector(`input[name="${id}"]`);
    return radioField ? buildRadioRecapItem(id) : "";
  }
  const value = getFieldDisplayValue(field);
  if (!value) return "";
  return `<dt>${getFieldLabel(id)}</dt><dd>${value}</dd>`;
}

function getStepFieldIds(stepEl) {
  const fields = [...stepEl.querySelectorAll("input, select, textarea")];
  return fields.reduce((acc, field) => {
    const id = field.type === "radio" ? field.name : field.id;
    if (id && !acc.includes(id)) {
      return [...acc, id];
    }
    return acc;
  }, []);
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

function validateRadioGroup(name, stepEl) {
  const radios = stepEl.querySelectorAll(`input[name="${name}"]`);
  const checked = stepEl.querySelector(`input[name="${name}"]:checked`);
  if (radios[0]?.required && !checked) {
    radios[0].focus();
    radios[0].reportValidity();
    return false;
  }
  return true;
}

function validateField(field, stepEl) {
  // Radio buttons need group validation
  if (field.type === "radio") {
    return validateRadioGroup(field.name, stepEl);
  }
  // Use HTML5 constraint validation (checks required, email format, patterns, etc.)
  if (!field.checkValidity()) {
    field.focus();
    field.reportValidity();
    return false;
  }
  return true;
}

function validateStep(stepEl) {
  const requiredFields = stepEl.querySelectorAll("[required]");
  for (const field of requiredFields) {
    if (!validateField(field, stepEl)) return false;
  }
  return true;
}

function updateIndicators(indicators, currentStep) {
  for (const [index, indicator] of indicators.entries()) {
    indicator.classList.toggle("active", index === currentStep);
    indicator.classList.toggle("completed", index < currentStep);
  }
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
  if (!container) return;

  const steps = container.querySelectorAll(".quote-step");
  const indicators = container.querySelectorAll(".quote-steps-indicator");
  const prevBtn = container.querySelector(".quote-step-prev");
  const nextBtn = container.querySelector(".quote-step-next");
  const submitBtn = container.querySelector(".quote-step-submit");

  if (!steps.length || !prevBtn || !nextBtn || !submitBtn) return;

  const totalSteps = steps.length;

  function updateUI() {
    const currentStep = getCurrentStep(container);
    for (const [index, step] of steps.entries()) {
      step.classList.toggle("active", index === currentStep);
    }
    updateIndicators(indicators, currentStep);
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

  for (const [index, indicator] of indicators.entries()) {
    indicator.addEventListener("click", () => {
      if (index < getCurrentStep(container)) goToStep(index);
    });
  }

  updateUI();
}

onReady(initQuoteSteps);

// Exports for testing
export {
  buildFieldRecapItem,
  buildRadioRecapItem,
  getCurrentStep,
  getFieldDisplayValue,
  getFieldLabel,
  getRadioLabel,
  getRadioValue,
  getStepFieldIds,
  initQuoteSteps,
  populateRecap,
  updateButtons,
  updateIndicators,
  validateField,
  validateRadioGroup,
  validateStep,
};
