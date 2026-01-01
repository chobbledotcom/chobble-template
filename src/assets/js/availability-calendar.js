// Availability Calendar
// Displays a 12-month calendar with unavailable dates greyed out

import { onReady } from "#assets/on-ready.js";
import { IDS } from "#assets/selectors.js";
import { getTemplate } from "#assets/template.js";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDialog() {
  return document.getElementById("availability-calendar");
}

function getContent() {
  return document.querySelector("#availability-calendar .calendar-content");
}

function showLoading() {
  const content = getContent();
  if (content) {
    content.innerHTML = "";
    const p = document.createElement("p");
    p.className = "calendar-loading";
    p.textContent = "Loading...";
    content.appendChild(p);
  }
}

function showError(message) {
  const content = getContent();
  if (content) {
    content.innerHTML = "";
    const p = document.createElement("p");
    p.className = "calendar-error";
    p.textContent = message;
    content.appendChild(p);
  }
}

function renderCalendar(unavailableDates) {
  const content = getContent();
  if (!content) return;

  const unavailableSet = new Set(unavailableDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStr = formatDate(today);

  content.innerHTML = "";
  const container = document.createElement("div");
  container.className = "calendar-months";

  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    container.appendChild(renderMonth(monthDate, unavailableSet, todayStr));
  }

  content.appendChild(container);
}

function renderMonth(monthDate, unavailableSet, todayStr) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Monday = 0, Sunday = 6 (ISO week)
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const monthTemplate = getTemplate(IDS.CALENDAR_MONTH);
  monthTemplate.querySelector('[data-field="title"]').textContent =
    `${MONTHS[month]} ${year}`;
  const grid = monthTemplate.querySelector(".calendar-grid");

  // Day headers
  for (const day of DAYS) {
    const header = document.createElement("span");
    header.className = "calendar-day-header";
    header.textContent = day;
    grid.appendChild(header);
  }

  // Empty cells before first day
  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement("span");
    empty.className = "calendar-day empty";
    grid.appendChild(empty);
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(new Date(year, month, day));
    const isPast = dateStr < todayStr;
    const isUnavailable = unavailableSet.has(dateStr);
    const isToday = dateStr === todayStr;

    const dayEl = document.createElement("span");
    dayEl.className = "calendar-day";
    dayEl.textContent = day;

    if (isPast) dayEl.classList.add("past");
    if (isUnavailable && !isPast) dayEl.classList.add("unavailable");
    if (isToday) dayEl.classList.add("today");

    grid.appendChild(dayEl);
  }

  return monthTemplate;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchAvailability(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load availability");
  }
  return response.json();
}

async function openCalendar(apiUrl) {
  const dialog = getDialog();
  if (!dialog) return;

  showLoading();
  dialog.showModal();

  try {
    const dates = await fetchAvailability(apiUrl);
    renderCalendar(dates);
  } catch (_err) {
    showError("Unable to load availability. Please try again.");
  }
}

function init() {
  // Handle button clicks via delegation
  document.addEventListener("click", (e) => {
    const button = e.target.closest(".check-availability");
    if (button) {
      const apiUrl = button.dataset.apiUrl;
      if (apiUrl) {
        openCalendar(apiUrl);
      }
    }
  });

  // Light dismiss (click on backdrop)
  const dialog = getDialog();
  if (dialog) {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });
  }
}

onReady(init);
