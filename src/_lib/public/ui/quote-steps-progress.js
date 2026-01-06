// Renders and updates the step progress indicator

import { onReady } from "#public/utils/on-ready.js";

function renderIndicator(step, index) {
  return `<li data-step="${index}">
      <span data-name="name">${step.name}</span>
      <span data-name="index">${step.number}</span>
    </li>`;
}

export function renderStepProgress(container, steps, completedSteps) {
  container.innerHTML = `<ul>${steps.map(renderIndicator).join("")}</ul>`;
  updateStepProgress(container, completedSteps);
}

export function updateStepProgress(container, completedSteps) {
  const indicators = container.querySelectorAll("li");
  for (const [index, indicator] of indicators.entries()) {
    const isActive = index === completedSteps;
    const isCompleted = index < completedSteps;
    indicator.setAttribute("aria-current", isActive ? "step" : "false");
    indicator.classList.toggle("completed", isCompleted);
  }
}

function initStandaloneProgress() {
  const allContainers = document.querySelectorAll(".quote-steps-progress");
  const container = Array.from(allContainers).find(
    (el) => !el.closest(".quote-steps"),
  );
  if (container === undefined) return;

  const dataScript = document.querySelector(".quote-steps-data");
  const steps = JSON.parse(dataScript.textContent);
  const completedSteps = parseInt(container.dataset.completedSteps, 10);
  renderStepProgress(container, steps, completedSteps);
}

onReady(initStandaloneProgress);
