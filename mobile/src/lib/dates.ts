// Calendar dates are local YYYY-MM-DD strings.
export function keyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function shift(k: string, n: number): string {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}
export const today = () => keyOf(new Date());
export function range(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to; k = shift(k, 1)) out.push(k);
  return out;
}
export const isDateKey = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
