// Availability Calendar
// Displays a 12-month calendar with unavailable dates greyed out

import { onReady } from "./on-ready.js";

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
    content.innerHTML = '<p class="calendar-loading">Loading...</p>';
  }
}

function showError(message) {
  const content = getContent();
  if (content) {
    content.innerHTML = `<p class="calendar-error">${message}</p>`;
  }
}

function renderCalendar(unavailableDates) {
  const content = getContent();
  if (!content) return;

  const unavailableSet = new Set(unavailableDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStr = formatDate(today);

  let html = '<div class="calendar-months">';

  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    html += renderMonth(monthDate, unavailableSet, todayStr);
  }

  html += "</div>";
  content.innerHTML = html;
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

  let html = `<div class="calendar-month">`;
  html += `<h3>${MONTHS[month]} ${year}</h3>`;
  html += `<div class="calendar-grid">`;

  // Day headers
  for (const day of DAYS) {
    html += `<span class="calendar-day-header">${day}</span>`;
  }

  // Empty cells before first day
  for (let i = 0; i < startDay; i++) {
    html += `<span class="calendar-day empty"></span>`;
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(new Date(year, month, day));
    const isPast = dateStr < todayStr;
    const isUnavailable = unavailableSet.has(dateStr);
    const isToday = dateStr === todayStr;

    let classes = "calendar-day";
    if (isPast) classes += " past";
    if (isUnavailable && !isPast) classes += " unavailable";
    if (isToday) classes += " today";

    html += `<span class="${classes}">${day}</span>`;
  }

  html += `</div></div>`;
  return html;
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

function openCalendar(apiUrl) {
  const dialog = getDialog();
  if (!dialog) return;

  showLoading();
  dialog.showModal();

  fetchAvailability(apiUrl)
    .then((dates) => {
      renderCalendar(dates);
    })
    .catch((err) => {
      showError("Unable to load availability. Please try again.");
      console.error("Availability calendar error:", err);
    });
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
