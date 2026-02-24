import { submitForm } from "#public/utils/http.js";
import { sendNtfyNotification } from "#public/utils/ntfy.js";
import { onReady } from "#public/utils/on-ready.js";

const FORM_SELECTOR = "form.contact-form";

onReady(() => {
  for (const form of document.querySelectorAll(FORM_SELECTOR)) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = event.target.querySelector("button[type=submit]");
      const redirectInput = event.target.querySelector(
        'input[name="_redirect"]',
      );
      const redirectUrl = redirectInput?.value || "";

      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = "Submitting..";

      const result = await submitForm(event.target, redirectUrl);

      if (result.ok) {
        window.location.href = result.url;
        return;
      }

      sendNtfyNotification(
        `Contact form submission failed: ${result.error.message}`,
      );
      button.disabled = false;
      button.textContent = button.dataset.originalText;
      alert(
        `Something went wrong submitting the form. ${result.error.message}`,
      );
    });
  }
});
