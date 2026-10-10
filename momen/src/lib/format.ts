const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? "₦";

export function money(n: number | null | undefined) {
  const v = n ?? 0;
  const sign = v < 0 ? "-" : "";
  return `${sign}${CURRENCY}${Math.abs(v).toLocaleString("en-NG")}`;
}

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtShortDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** yyyy-mm-dd for <input type="date"> */
export function toInputDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Whole days from today until d (negative = past). */
export function daysUntil(d: Date | string) {
  const ms = startOfDay(new Date(d)).getTime() - startOfDay().getTime();
  return Math.round(ms / 86_400_000);
}

export function relativeDays(d: Date | string | null | undefined) {
  if (!d) return "";
  const n = daysUntil(d);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(ym: string) {
  const { start } = monthRange(ym);
  return start.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function shiftMonth(ym: string, delta: number) {
  const { start } = monthRange(ym);
  start.setMonth(start.getMonth() + delta);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
}
