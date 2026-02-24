import { onReady } from "#public/utils/on-ready.js";

const FORM_SELECTOR = "form.contact-form";

onReady(() => {
  for (const form of document.querySelectorAll(FORM_SELECTOR)) {
    form.addEventListener("submit", () => {
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "Submitting..";
    });
  }
});
