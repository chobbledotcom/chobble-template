// Non-blocking toast notifications
// Replaces browser-native alert() to avoid blocking the main thread

const CONTAINER_ID = "toast-notifications";
const DISPLAY_MS = 4000;

export const showNotification = (message) => {
  const existing = document.getElementById(CONTAINER_ID);
  const container = existing || document.createElement("div");
  if (!existing) {
    container.id = CONTAINER_ID;
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger enter animation on next frame
  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  setTimeout(() => {
    toast.classList.remove("toast-visible");
    toast.addEventListener("transitionend", () => toast.remove());
  }, DISPLAY_MS);
};
