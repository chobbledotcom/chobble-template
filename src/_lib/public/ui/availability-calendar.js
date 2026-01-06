// Availability Calendar
// Displays a 12-month calendar with unavailable dates greyed out

import { createElement } from "#public/utils/dom.js";
import { fetchJson } from "#public/utils/http.js";
import { onReady } from "#public/utils/on-ready.js";
import { IDS } from "#public/utils/selectors.js";
import { getTemplate } from "#public/utils/template.js";
import { memberOf } from "#utils/array-utils.js";

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

const getDialog = () => document.getElementById("availability-calendar");

const getContent = () =>
  document.querySelector("#availability-calendar .calendar-content");

const setContent = (element) => {
  const content = getContent();
  if (content) {
    content.replaceChildren(element);
  }
};

const showLoading = () =>
  setContent(createElement("p", "calendar-loading", "Loading..."));

const showError = (message) =>
  setContent(createElement("p", "calendar-error", message));

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStartDay = (firstDay) => {
  const dayIndex = firstDay.getDay() - 1;
  return dayIndex < 0 ? 6 : dayIndex;
};

const getDayClasses = (dateStr, todayStr, isUnavailable) => {
  const isPast = dateStr < todayStr;
  const isToday = dateStr === todayStr;
  return [
    "calendar-day",
    isPast && "past",
    isUnavailable && !isPast && "unavailable",
    isToday && "today",
  ]
    .filter(Boolean)
    .join(" ");
};

const createDayHeaders = () =>
  DAYS.map((day) => createElement("span", "calendar-day-header", day));

const createEmptyCells = (count) =>
  Array.from({ length: count }, () =>
    createElement("span", "calendar-day empty"),
  );

const createDayCells = (year, month, daysInMonth, isUnavailable, todayStr) =>
  Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = formatDate(new Date(year, month, day));
    const className = getDayClasses(dateStr, todayStr, isUnavailable(dateStr));
    return createElement("span", className, String(day));
  });

const renderMonth = (monthDate, isUnavailable, todayStr) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDay = getStartDay(firstDay);

  const monthTemplate = getTemplate(IDS.CALENDAR_MONTH, document);
  monthTemplate.querySelector('[data-field="title"]').textContent =
    `${MONTHS[month]} ${year}`;

  const grid = monthTemplate.querySelector(".calendar-grid");
  const allCells = [
    ...createDayHeaders(),
    ...createEmptyCells(startDay),
    ...createDayCells(year, month, daysInMonth, isUnavailable, todayStr),
  ];
  grid.replaceChildren(...allCells);

  return monthTemplate;
};

const getToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const renderCalendar = (unavailableDates) => {
  const content = getContent();
  if (!content) return;

  const isUnavailable = memberOf(unavailableDates);
  const today = getToday();
  const todayStr = formatDate(today);

  const months = Array.from({ length: 12 }, (_, i) =>
    renderMonth(
      new Date(today.getFullYear(), today.getMonth() + i, 1),
      isUnavailable,
      todayStr,
    ),
  );

  const container = createElement("div", "calendar-months");
  container.replaceChildren(...months);
  content.replaceChildren(container);
};

const openCalendar = async (apiUrl) => {
  const dialog = getDialog();
  if (!dialog) return;

  showLoading();
  dialog.showModal();

  const dates = await fetchJson(apiUrl);
  if (dates) {
    renderCalendar(dates);
  } else {
    showError("Unable to load availability. Please try again.");
  }
};

const handleButtonClick = (e) => {
  const button = e.target.closest(".check-availability");
  if (button?.dataset.apiUrl) {
    openCalendar(button.dataset.apiUrl);
  }
};

const handleDialogClick = (dialog) => (e) => {
  if (e.target === dialog) {
    dialog.close();
  }
};

const init = () => {
  document.addEventListener("click", handleButtonClick);

  const dialog = getDialog();
  if (dialog) {
    dialog.addEventListener("click", handleDialogClick(dialog));
  }
};

onReady(init);
