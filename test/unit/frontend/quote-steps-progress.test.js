// Tests for quote-steps-progress.js

import { describe, expect, test } from "bun:test";
import {
  renderStepProgress,
  updateStepProgress,
} from "#assets/quote-steps-progress.js";

describe("quote-steps-progress", () => {
  const steps = [
    { name: "Items", number: 1 },
    { name: "Event", number: 2 },
    { name: "Contact", number: 3 },
    { name: "Review", number: 4 },
  ];

  describe("renderStepProgress", () => {
    test("renders all steps with indicators and connectors", () => {
      document.body.innerHTML = '<div class="quote-steps-progress"></div>';
      const container = document.querySelector(".quote-steps-progress");
      renderStepProgress(container, steps, 0);

      const indicators = container.querySelectorAll(".quote-steps-indicator");
      const connectors = container.querySelectorAll(".quote-steps-connector");

      expect(indicators.length).toBe(4);
      expect(connectors.length).toBe(3);
    });

    test("renders step names and numbers", () => {
      document.body.innerHTML = '<div class="quote-steps-progress"></div>';
      const container = document.querySelector(".quote-steps-progress");
      renderStepProgress(container, steps, 0);

      const indicators = container.querySelectorAll(".quote-steps-indicator");
      expect(indicators[0].querySelector(".step-name").textContent).toBe(
        "Items",
      );
      expect(indicators[0].querySelector(".step-number").textContent).toBe("1");
      expect(indicators[3].querySelector(".step-name").textContent).toBe(
        "Review",
      );
      expect(indicators[3].querySelector(".step-number").textContent).toBe("4");
    });

    test("sets data-step attribute on indicators", () => {
      document.body.innerHTML = '<div class="quote-steps-progress"></div>';
      const container = document.querySelector(".quote-steps-progress");
      renderStepProgress(container, steps, 0);

      const indicators = container.querySelectorAll(".quote-steps-indicator");
      expect(indicators[0].dataset.step).toBe("0");
      expect(indicators[1].dataset.step).toBe("1");
      expect(indicators[2].dataset.step).toBe("2");
      expect(indicators[3].dataset.step).toBe("3");
    });

    test("sets active class on completed step", () => {
      document.body.innerHTML = '<div class="quote-steps-progress"></div>';
      const container = document.querySelector(".quote-steps-progress");
      renderStepProgress(container, steps, 1);

      const indicators = container.querySelectorAll(".quote-steps-indicator");
      expect(indicators[0].classList.contains("completed")).toBe(true);
      expect(indicators[1].classList.contains("active")).toBe(true);
      expect(indicators[2].classList.contains("active")).toBe(false);
    });
  });

  describe("updateStepProgress", () => {
    test("updates active class based on completed steps", () => {
      document.body.innerHTML = '<div class="quote-steps-progress"></div>';
      const container = document.querySelector(".quote-steps-progress");
      renderStepProgress(container, steps, 0);

      updateStepProgress(container, 2);

      const indicators = container.querySelectorAll(".quote-steps-indicator");
      expect(indicators[0].classList.contains("completed")).toBe(true);
      expect(indicators[1].classList.contains("completed")).toBe(true);
      expect(indicators[2].classList.contains("active")).toBe(true);
      expect(indicators[3].classList.contains("active")).toBe(false);
    });

    test("clears previous active/completed states", () => {
      document.body.innerHTML = '<div class="quote-steps-progress"></div>';
      const container = document.querySelector(".quote-steps-progress");
      renderStepProgress(container, steps, 2);

      updateStepProgress(container, 0);

      const indicators = container.querySelectorAll(".quote-steps-indicator");
      expect(indicators[0].classList.contains("active")).toBe(true);
      expect(indicators[1].classList.contains("completed")).toBe(false);
      expect(indicators[2].classList.contains("completed")).toBe(false);
    });
  });
});
