/** Asia/Bangkok display + dateKey helpers for pickup selection UI. */

export const PICKUP_TIMEZONE = "Asia/Bangkok";

/** Calendar date keys used as availability query candidates (not ops rules). */
export const PICKUP_DATE_CANDIDATE_COUNT = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today (date-only) in the application timezone. */
export function bangkokToday(fromDate = new Date()): Date {
  const localized = new Date(
    fromDate.toLocaleString("en-US", { timeZone: PICKUP_TIMEZONE }),
  );
  return new Date(
    localized.getFullYear(),
    localized.getMonth(),
    localized.getDate(),
  );
}

/** Next N calendar days from today in Asia/Bangkok as YYYY-MM-DD keys. */
export function getCandidateDateKeys(
  count = PICKUP_DATE_CANDIDATE_COUNT,
  fromDate = new Date(),
): string[] {
  const start = bangkokToday(fromDate);
  return Array.from({ length: count }, (_, index) =>
    toDateKey(new Date(start.getTime() + index * DAY_MS)),
  );
}

export function formatPickupDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatPickupDateKey(dateKey: string): string {
  return formatPickupDate(parseDateKey(dateKey));
}

export function formatPickupDateLong(date: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const label = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  const today = bangkokToday();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return `${label} (Today)`;
  }
  return label;
}

export function formatPickupDateKeyLong(dateKey: string): string {
  return formatPickupDateLong(parseDateKey(dateKey));
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
