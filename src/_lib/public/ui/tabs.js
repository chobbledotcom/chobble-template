import { onReady } from "#assets/utils/on-ready.js";

const processed = new WeakSet();

const setActiveTab = (tabs, activeLink) => {
  for (const link of tabs) {
    link.closest(".tab").classList.remove("active");
  }
  activeLink.closest(".tab").classList.add("active");
};

const addListener = (link, tabs) => {
  if (processed.has(link)) return;
  processed.add(link);
  link.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveTab(tabs, link);
    history.pushState({}, "", link.href);
    history.pushState({}, "", link.href);
    history.back();
  });
};

const initTabs = () => {
  const tabs = document.querySelectorAll("#tabs a[href^='#tab-']");
  if (tabs.length === 0) return;

  const hash = window.location.hash;
  const activeLink = [...tabs].find((t) => t.getAttribute("href") === hash);
  setActiveTab(tabs, activeLink || tabs[0]);

  for (const tab of tabs) {
    addListener(tab, tabs);
  }
};

onReady(initTabs);
