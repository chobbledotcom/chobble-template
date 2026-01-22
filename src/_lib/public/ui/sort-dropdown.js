import { onReady } from "#public/utils/on-ready.js";

onReady(() => {
  document.addEventListener("change", (event) => {
    if (!event.target.classList.contains("sort-select")) return;
    window.location.href = event.target.value;
  });
});
