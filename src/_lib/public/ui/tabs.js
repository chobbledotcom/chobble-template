import { onReady } from "#public/utils/on-ready.js";

const setActiveTab = (tabs, activeLink) => {
  for (const link of tabs) {
    link.closest(".tab").classList.remove("active");
  }
  activeLink.closest(".tab").classList.add("active");
};

onReady(() => {
  const tabs = document.querySelectorAll("#tabs a[href^='#tab-']");
  if (tabs.length === 0) return;

  const activeLink = [...tabs].find(
    (t) => t.getAttribute("href") === window.location.hash,
  );
  setActiveTab(tabs, activeLink || tabs[0]);

  for (const tab of tabs) {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveTab(tabs, tab);
      history.pushState({}, "", tab.href);
      history.pushState({}, "", tab.href);
      history.back();
    });
  }
});
