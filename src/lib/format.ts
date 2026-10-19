// Nepali rupees, lakh/crore grouping (e.g. Rs. 12,34,567.50)
export const CURRENCY = "Rs.";

const amount = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(n: number): string {
  const v = n ?? 0;
  return `${v < 0 ? "-" : ""}${CURRENCY} ${amount.format(Math.abs(v))}`;
}

export function date(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function num(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n ?? 0);
}
