(function (root) {
  "use strict";
  const todayKey = (now = new Date()) => {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(now);
    const value = (type) => parts.find((part) => part.type === type).value;
    return `${value("year")}-${value("month")}-${value("day")}`;
  };
  const dateKey = (date) => {
    const [month, day] = String(date).split("/").map(Number);
    return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  const partition = (rows, now = new Date()) => {
    const today = todayKey(now);
    const ordered = [...rows].sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)));
    return {
      today,
      upcoming: ordered.filter((row) => dateKey(row.date) >= today),
      past: ordered.filter((row) => dateKey(row.date) < today),
    };
  };
  const api = { todayKey, dateKey, partition };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CORE_SCHEDULE_TIMELINE = api;
})(typeof window !== "undefined" ? window : globalThis);
