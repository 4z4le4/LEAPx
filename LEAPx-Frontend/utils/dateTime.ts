/* ===================== Types ===================== */
export type Lang = "th" | "en";

/* ===================== Helpers ===================== */
function isSameDayUTC(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/* ===================== Main formatter ===================== */
export function formatDateTimeRange(
  start?: Date | string | null,
  end?: Date | string | null,
  lang: "th" | "en" = "th",
) {
  if (!start || !end) return "-";

  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;

  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return "-";
  }

  const locale = lang === "en" ? "en-US" : "th-TH";

  const sameDay = isSameDayUTC(s, e);

  const formatDate = (d: Date) =>
    d.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC", // ⭐ สำคัญ
    });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC", // ⭐ สำคัญ
    });

  // ---- EN ----
  if (lang === "en") {
    if (sameDay) {
      return `${formatDate(s)} at ${formatTime(s)} – ${formatTime(e)}`;
    }
    return `${formatDate(s)} – ${formatDate(e)} at ${formatTime(s)} – ${formatTime(e)}`;
  }

  // ---- TH ----
  if (sameDay) {
    return `${formatDate(s)} เวลา ${formatTime(s)} – ${formatTime(e)} น.`;
  }

  return `${formatDate(s)} เวลา ${formatTime(s)} น. – ${formatDate(e)} เวลา ${formatTime(e)} น.`;
}
