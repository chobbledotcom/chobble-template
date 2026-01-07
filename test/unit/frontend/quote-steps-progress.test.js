// Tests for quote-steps-progress.js

import { describe, expect, test } from "bun:test";
import {
  initStandaloneProgress,
  renderStepProgress,
  updateStepProgress,
} from "#public/ui/quote-steps-progress.js";
import {
  indicatorTemplate,
  QUOTE_STEPS,
  testIndicatorStates,
} from "#test/unit/frontend/quote-steps-utils.js";

describe("quote-steps-progress", () => {
  const steps = QUOTE_STEPS;

  describe("renderStepProgress", () => {
    test("renders all steps as list items", () => {
      document.body.innerHTML = `
        ${indicatorTemplate}
        <div class="quote-steps-progress"></div>
      `;
      const container = document.querySelector(".quote-steps-progress");
      renderStepProgress(container, steps, 0);

      expect(container.querySelector("ul")).not.toBeNull();
      expect(container.querySelectorAll("li").length).toBe(4);
    });

    test("renders step names and numbers", () => {
      document.body.innerHTML = `
        ${indicatorTemplate}
        <div class="quote-steps-progress"></div>
      `;
      const container = document.querySelector(".quote-steps-progress");
      renderStepProgress(container, steps, 0);

      const indicators = [...container.querySelectorAll("li")];
      expect(
        indicators.map(
          (el) => el.querySelector('[data-name="name"]').textContent,
        ),
      ).toEqual(["Items", "Event", "Contact", "Review"]);
      expect(
        indicators.map(
          (el) => el.querySelector('[data-name="index"]').textContent,
        ),
      ).toEqual(["1", "2", "3", "4"]);
    });

    test("sets data-step attribute on indicators", () => {
      document.body.innerHTML = `
        ${indicatorTemplate}
        <div class="quote-steps-progress"></div>
      `;
      const container = document.querySelector(".quote-steps-progress");
      renderStepProgress(container, steps, 0);

      const dataSteps = [...container.querySelectorAll("li")].map(
        (el) => el.dataset.step,
      );
      expect(dataSteps).toEqual(["0", "1", "2", "3"]);
    });

    test("sets aria-current on active step", () => {
      document.body.innerHTML = `
        ${indicatorTemplate}
        <div class="quote-steps-progress"></div>
      `;
      const container = document.querySelector(".quote-steps-progress");
      renderStepProgress(container, steps, 1);

      testIndicatorStates(1, 1);
    });
  });

  describe("updateStepProgress", () => {
    test("updates aria-current based on completed steps", () => {
      document.body.innerHTML = `
        ${indicatorTemplate}
        <div class="quote-steps-progress"></div>
      `;
      const container = document.querySelector(".quote-steps-progress");
      renderStepProgress(container, steps, 0);
      updateStepProgress(container, 2);

      testIndicatorStates(2, 2);
    });

    test("clears previous active/completed states", () => {
      document.body.innerHTML = `
        ${indicatorTemplate}
        <div class="quote-steps-progress"></div>
      `;
      const container = document.querySelector(".quote-steps-progress");
      renderStepProgress(container, steps, 2);
      updateStepProgress(container, 0);

      testIndicatorStates(0, 0);
    });
  });

  describe("initStandaloneProgress", () => {
    const stepsJson = JSON.stringify(steps);

    test("initializes standalone progress indicator", () => {
      document.body.innerHTML = `
        ${indicatorTemplate}
        <div class="quote-steps-progress" data-completed-steps="1"></div>
        <script class="quote-steps-data" type="application/json">${stepsJson}</script>
      `;
      initStandaloneProgress();

      const container = document.querySelector(".quote-steps-progress");
      const indicators = [...container.querySelectorAll("li")];

      expect(indicators.length).toBe(4);
      expect(
        indicators.map((el) => el.classList.contains("completed")),
      ).toEqual([true, false, false, false]);
      expect(indicators[1].getAttribute("aria-current")).toBe("step");
    });

    test("does not error when container is missing", () => {
      document.body.innerHTML = indicatorTemplate;
      expect(() => initStandaloneProgress()).not.toThrow();
    });

    // Note: We trust templates to always include dataScript with progress container
    // No test for missing dataScript - that would be a template bug

    test("ignores progress indicators inside quote-steps form", () => {
      document.body.innerHTML = `
        ${indicatorTemplate}
        <div class="quote-steps">
          <div class="quote-steps-progress" data-completed-steps="1"></div>
        </div>
        <script class="quote-steps-data" type="application/json">${stepsJson}</script>
      `;
      initStandaloneProgress();

      const container = document.querySelector(".quote-steps-progress");
      expect(container.querySelectorAll("li").length).toBe(0);
    });

    test("only initializes standalone progress indicators", () => {
      document.body.innerHTML = `
        ${indicatorTemplate}
        <div class="quote-steps">
          <div class="quote-steps-progress"></div>
        </div>
        <div class="quote-steps-progress" data-completed-steps="2"></div>
        <script class="quote-steps-data" type="application/json">${stepsJson}</script>
      `;
      initStandaloneProgress();

      const standaloneContainer = document.querySelectorAll(
        ".quote-steps-progress",
      )[1];
      const indicators = [...standaloneContainer.querySelectorAll("li")];

      expect(indicators.length).toBe(4);
      expect(indicators[2].getAttribute("aria-current")).toBe("step");
    });
  });
});
