import { onReady } from "#public/utils/on-ready.js";

export const initFreetobook = () => {
  const section = document.getElementById("freetobook");
  if (!section) return;

  const details = section.querySelector("details");
  if (!details) return;

  const summary = details.querySelector("summary");
  if (!summary) return;

  const updateSummary = (isOpen) => {
    if (isOpen) {
      summary.classList.remove("btn--primary");
      summary.classList.add("btn--secondary", "btn--sm");
      summary.textContent = "Hide Booking Form";
    } else {
      summary.classList.remove("btn--secondary", "btn--sm");
      summary.classList.add("btn--primary");
      summary.textContent = "Check Availability / Book Online";
    }
  };

  details.addEventListener("toggle", () => {
    updateSummary(details.open);
  });

  if (window.location.hash === "#freetobook") {
    details.open = true;
  }

  document.addEventListener("click", (event) => {
    const anchor = event.target.closest('[href="#freetobook"]');
    if (!anchor) return;
    event.preventDefault();
    if (!details.open) {
      details.open = true;
    }
    section.scrollIntoView({ behavior: "smooth" });
    history.pushState(null, "", "#freetobook");
  });
};

onReady(initFreetobook);
