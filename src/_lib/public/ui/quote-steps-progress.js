// Renders and updates the step progress indicator

import { onReady } from "#public/utils/on-ready.js";

function renderIndicator(step, index, isLast) {
  const indicator = `<div class="quote-steps-indicator" data-step="${index}">
      <span class="step-name">${step.name}</span>
      <span class="step-number">${step.number}</span>
    </div>`;
  return isLast
    ? indicator
    : `${indicator}<div class="quote-steps-connector"></div>`;
}

export function renderStepProgress(container, steps, completedSteps) {
  container.innerHTML = steps
    .map((step, i) => renderIndicator(step, i, i === steps.length - 1))
    .join("");
  updateStepProgress(container, completedSteps);
}

export function updateStepProgress(container, completedSteps) {
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
  if (!container) return;

  const dataScript = document.querySelector(".quote-steps-data");
  if (!dataScript) return;

  const steps = JSON.parse(dataScript.textContent);
  const completedSteps = parseInt(container.dataset.completedSteps, 10);
  renderStepProgress(container, steps, completedSteps);
}

onReady(initStandaloneProgress);
