// Renders and updates the step progress indicator

import { getTemplate, IDS, onReady } from "#public/utils/ui-deps.js";

export function renderStepProgress(container, steps, completedSteps) {
  const ul = document.createElement("ul");
  for (const [index, step] of steps.entries()) {
    const template = getTemplate(IDS.QUOTE_STEP_INDICATOR, document);
    const li = template.querySelector("li");
    li.dataset.step = index;
    li.querySelector('[data-name="name"]').textContent = step.name;
    li.querySelector('[data-name="index"]').textContent = step.number;
    ul.appendChild(li);
  }
  container.innerHTML = "";
  container.appendChild(ul);
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

export function initStandaloneProgress() {
  const allContainers = document.querySelectorAll(".quote-steps-progress");
  const container = Array.from(allContainers).find(
    (el) => !el.closest(".quote-steps"),
  );
  if (container === undefined) return;

  const dataScript = document.querySelector(".quote-steps-data");
  const steps = JSON.parse(dataScript.textContent);
  const completedSteps = Number.parseInt(container.dataset.completedSteps, 10);
  renderStepProgress(container, steps, completedSteps);
}

onReady(initStandaloneProgress);
