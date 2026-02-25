import { onReady } from "#public/utils/on-ready.js";

const setActiveTab = (container, targetId) => {
  for (const link of container.querySelectorAll("ul a")) {
    link.classList.toggle("active", link.getAttribute("href") === targetId);
  }
  for (const panel of container.querySelectorAll(":scope > div")) {
    panel.classList.toggle("active", `#${panel.id}` === targetId);
  }
};

onReady(() => {
  const container = document.getElementById("tabs");
  if (!container) return;

  const links = container.querySelectorAll("ul a");
  if (links.length === 0) return;

  const initialTarget =
    [...links].find((l) => l.getAttribute("href") === window.location.hash) ||
    links[0];
  setActiveTab(container, initialTarget.getAttribute("href"));

  for (const link of links) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const targetId = link.getAttribute("href");
      setActiveTab(container, targetId);
      history.replaceState({}, "", targetId);
      history.pushState({}, "", targetId);
      history.back();
    });
  }
});
