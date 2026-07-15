/** Placeholder boutique / slots — Thailand ops content pending owner approval. */

export type MockBoutique = {
  id: string;
  name: string;
  address: string;
};

export type MockTimeSlot = {
  id: string;
  label: string;
  start: string;
  end: string;
};

export const MOCK_BOUTIQUE: MockBoutique = {
  id: "boutique-pending",
  name: "[BOUTIQUE PENDING APPROVAL]",
  address: "[ADDRESS PENDING APPROVAL]",
};

/** Example slots only — not real Thailand availability. */
export const MOCK_TIME_SLOTS: MockTimeSlot[] = [
  { id: "1000-1030", label: "10:00–10:30", start: "10:00", end: "10:30" },
  { id: "1030-1100", label: "10:30–11:00", start: "10:30", end: "11:00" },
  { id: "1100-1130", label: "11:00–11:30", start: "11:00", end: "11:30" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Next 7 calendar days from “today” in Asia/Bangkok (date-only). */
export function getMockPickupDates(fromDate = new Date(), count = 7): Date[] {
  const bangkokToday = new Date(
    fromDate.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }),
  );
  const start = new Date(
    bangkokToday.getFullYear(),
    bangkokToday.getMonth(),
    bangkokToday.getDate(),
  );

  return Array.from({ length: count }, (_, index) => {
    return new Date(start.getTime() + index * DAY_MS);
  });
}

export function formatPickupDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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
  const today = getMockPickupDates(new Date(), 1)[0];
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return `${label} (Today)`;
  }
  return label;
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
