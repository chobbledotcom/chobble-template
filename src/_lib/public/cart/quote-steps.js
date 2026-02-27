/**
 * Quote form multi-step navigation with validation and recap.
 *
 * Features:
 * - Step transitions with progress indicator
 * - HTML5 validation with custom error styling
 * - Radio group validation
 * - Recap population for final review step
 * - Click-to-navigate on completed step indicators
 */
import {
  renderStepProgress,
  updateStepProgress,
} from "#public/ui/quote-steps-progress.js";
import { onReady } from "#public/utils/on-ready.js";
import { filter, map, pipe, uniqueBy } from "#toolkit/fp/array.js";

function getFieldLabel(fieldId) {
  const label = document.querySelector(`label[for="${fieldId}"]`);
  if (!label) return fieldId;

  const clone = label.cloneNode(true);

  for (const child of [...clone.children]) {
    child.remove();
  }

  return clone.textContent.trim();
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

function fieldRecapItem(id) {
  const field = document.getElementById(id);
  const value = getFieldDisplayValue(field);
  return value === "" ? "" : `<dt>${getFieldLabel(id)}</dt><dd>${value}</dd>`;
}

function buildRecapItem(ref) {
  return ref.isRadio ? buildRadioRecapItem(ref.id) : fieldRecapItem(ref.id);
}

const toFieldRef = (field) => ({
  isRadio: field.type === "radio",
  id: field.type === "radio" ? field.name : field.id,
});

const dedupeRefs = uniqueBy((ref) => ref.id);

function getStepFieldRefs(stepEl) {
  const fields = [...stepEl.querySelectorAll("input, select, textarea")];
  const refs = pipe(
    map(toFieldRef),
    filter((ref) => ref.id),
  )(fields);
  return dedupeRefs(refs);
}

function populateRecap(steps) {
  const recapEvent = document.getElementById("recap-event");
  const recapContact = document.getElementById("recap-contact");

  const eventFieldRefs = getStepFieldRefs(steps[0]);
  const contactFieldRefs = getStepFieldRefs(steps[1]);

  recapEvent.innerHTML = eventFieldRefs.map(buildRecapItem).join("");
  recapContact.innerHTML = contactFieldRefs.map(buildRecapItem).join("");
}

function getFieldWrapper(field) {
  if (field.type === "radio") {
    return field.closest("fieldset");
  }
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

function clearOnInput(field) {
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
    clearOnInput(radios[0]);
  }
  return isValid;
}

function validateField(field, stepEl) {
  if (field.type === "radio") {
    return validateRadioGroup(field.name, stepEl);
  }
  const isValid = field.checkValidity();
  if (isValid === false) {
    setFieldError(field, true);
    clearOnInput(field);
  }
  return isValid;
}

function validateStep(stepEl) {
  const requiredFields = [...stepEl.querySelectorAll("[required]")];
  const invalidFields = requiredFields.filter(
    (field) => !validateField(field, stepEl),
  );

  if (invalidFields.length > 0) {
    const firstInvalid = invalidFields[0];
    const wrapper = getFieldWrapper(firstInvalid);
    const scrollTarget = wrapper || firstInvalid;
    scrollTarget.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return invalidFields.length === 0;
}

function updateButtons(
  backToItemsBtn,
  prevBtn,
  nextBtn,
  submitBtn,
  currentStep,
  totalSteps,
) {
  if (backToItemsBtn) {
    backToItemsBtn.style.display = currentStep === 0 ? "" : "none";
  }
  prevBtn.style.display = currentStep === 0 ? "none" : "";
  nextBtn.style.display = currentStep === totalSteps - 1 ? "none" : "";
  submitBtn.style.display = currentStep === totalSteps - 1 ? "" : "none";
}

function getCurrentStep() {
  const stepsContainer = document.querySelector(".quote-steps");
  return Number.parseInt(stepsContainer?.dataset.currentStep || "0", 10);
}

function setCurrentStep(step) {
  const stepsContainer = document.querySelector(".quote-steps");
  if (stepsContainer) {
    stepsContainer.dataset.currentStep = step;
  }
}

function initQuoteSteps() {
  const stepsContainer = document.querySelector(".quote-steps");
  if (stepsContainer === null) return;

  const steps = document.querySelectorAll(".quote-step");
  const progressContainer = document.querySelector(".quote-steps-progress");
  const dataScript = document.querySelector(".quote-steps-data");
  const backToItemsBtn = document.querySelector(".quote-step-back-to-items");
  const prevBtn = document.querySelector(".quote-step-prev");
  const nextBtn = document.querySelector(".quote-step-next");
  const submitBtn = document.querySelector(".quote-step-submit");

  // Required elements for multi-step form functionality
  if (prevBtn === null || nextBtn === null || dataScript === null) return;

  const stepsData = JSON.parse(dataScript.textContent);
  const baseCompletedSteps = Number.parseInt(
    progressContainer.dataset.completedSteps,
    10,
  );

  renderStepProgress(progressContainer, stepsData, baseCompletedSteps);

  function updateUI() {
    const currentStep = getCurrentStep();
    for (const [index, stepEl] of steps.entries()) {
      stepEl.classList.toggle("active", index === currentStep);
    }
    updateStepProgress(progressContainer, baseCompletedSteps + currentStep);
    updateButtons(
      backToItemsBtn,
      prevBtn,
      nextBtn,
      submitBtn,
      currentStep,
      steps.length,
    );
    if (currentStep === steps.length - 1) populateRecap(steps);
  }

  function goToStep(newStep) {
    const currentStep = getCurrentStep();
    if (newStep < 0 || newStep >= steps.length) return;
    if (newStep > currentStep && !validateStep(steps[currentStep])) return;
    setCurrentStep(newStep);
    updateUI();
    stepsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  prevBtn.addEventListener("click", () => goToStep(getCurrentStep() - 1));
  nextBtn.addEventListener("click", () => goToStep(getCurrentStep() + 1));

  progressContainer.addEventListener("click", (e) => {
    const indicator = e.target.closest("li");
    if (indicator === null) return;
    const stepIndex = Number.parseInt(indicator.dataset.step, 10);
    const formStep = stepIndex - baseCompletedSteps;
    if (formStep >= 0 && formStep < getCurrentStep()) {
      goToStep(formStep);
    }
  });

  updateUI();
}

onReady(initQuoteSteps);

export { getRadioValue, initQuoteSteps };
