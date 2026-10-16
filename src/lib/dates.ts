// Day/month helpers. Attendance dates are stored as local midnight.

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Parse "YYYY-MM-DD" to local midnight; falls back to today. */
export function parseDay(value?: string | null): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Local date as "YYYY-MM-DD" (for <input type="date">). */
export function toDayInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Validate "YYYY-MM"; falls back to the current month. */
export function parseMonth(value?: string | null): string {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

/** [start, end) of a "YYYY-MM" month in local time. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

export function monthLabel(month: string): string {
  const { start } = monthRange(month);
  return start.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}
