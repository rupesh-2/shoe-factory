export const PIPELINE = [
  "Draft",
  "Confirmed",
  "In Production",
  "Shipped",
  "Delivered",
  "Closed",
] as const;

export function nextStatus(status: string): string | null {
  const i = PIPELINE.indexOf(status as (typeof PIPELINE)[number]);
  if (i < 0 || i >= PIPELINE.length - 1) return null;
  return PIPELINE[i + 1];
}
