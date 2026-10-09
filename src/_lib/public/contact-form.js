// Contact form behaviour, loaded only by pages that hold a contact form.
import { onReady } from "#public/utils/on-ready.js";

const PROTECTED_FORM = "form[data-botpoison-public-key]";

/**
 * Wire up every contact form on the page. A form that has been sent says so
 * on its button, which cannot be pressed again, so it is not sent twice.
 *
 * Botpoison is loaded only when a form asks for it: the library contacts
 * its service as soon as it loads, and then holds a protected form back
 * until its challenge is solved.
 */
export const initContactForms = async () => {
  for (const form of document.querySelectorAll("form.contact-form")) {
    form.addEventListener("submit", () => {
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "Sending…";
    });
  }
  if (document.querySelector(PROTECTED_FORM)) {
    await import("@botpoison/browser");
  }
};

onReady(initContactForms);
