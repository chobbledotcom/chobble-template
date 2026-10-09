import { afterEach, describe, expect, test, vi } from "vitest";

const botpoison = vi.hoisted(() => ({ loaded: vi.fn() }));

// The real library contacts the Botpoison service as soon as it loads.
vi.mock("@botpoison/browser", () => {
  botpoison.loaded();
  return {};
});

const { initContactForms } = await import("#public/contact-form.js");

/**
 * Put a form on the page and wire the page up.
 * @param {string} attributes - Attributes of the form element
 */
const setupForm = async (attributes = 'class="contact-form"') => {
  document.body.innerHTML = `
    <form ${attributes}>
      <button type="submit">Send Enquiry</button>
    </form>`;
  await initContactForms();
  const form = document.querySelector("form");
  // Sending the form would navigate away, which happy-dom cannot do.
  form.addEventListener("submit", (event) => event.preventDefault());
  return { form, button: form.querySelector("button") };
};

describe("contact-form", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("leaves the submit button alone until the form is sent", async () => {
    const { button } = await setupForm();
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe("Send Enquiry");
  });

  test("disables and relabels the submit button once the form is sent", async () => {
    const { form, button } = await setupForm();
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe("Sending…");
  });

  test("ignores forms that are not contact forms", async () => {
    const { form, button } = await setupForm('class="search"');
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(button.disabled).toBe(false);
  });

  test("loads Botpoison only for a form that carries a public key", async () => {
    await setupForm();
    expect(botpoison.loaded).not.toHaveBeenCalled();
    await setupForm('class="contact-form" data-botpoison-public-key="pk_test"');
    expect(botpoison.loaded).toHaveBeenCalledTimes(1);
  });
});
