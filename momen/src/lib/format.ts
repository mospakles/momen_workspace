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

/** Phone in a comparable form: digits only, +234 / 234 prefix turned back into a leading 0. */
export function normalizePhone(p: string | null | undefined) {
  if (!p) return null;
  const digits = p.replace(/\D/g, "").replace(/^234/, "0");
  return digits.length >= 7 ? digits : null;
}

/** yyyy-mm for the month picker */
export function toMonth(d: Date | string) {
  return toInputDate(d).slice(0, 7);
}

/** wa.me link for a Nigerian number, optionally with a message typed in. */
export function whatsappLink(phone: string, text?: string) {
  const n = phone.replace(/\D/g, "").replace(/^0/, "234");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** A polite balance reminder, ready to send on WhatsApp. */
export function reminderText(name: string, balance: number, outfits: string[]) {
  const first = name.trim().split(/\s+/)[0];
  const what = outfits.length === 1 ? `your ${outfits[0]}` : `your ${outfits.length} outfits (${outfits.join(", ")})`;
  return `Hello ${first}, I hope you're doing well. This is a gentle reminder that there's a balance of ${money(balance)} on ${what}. You can pay by transfer whenever you're ready. Thank you so much!`;
}

export function readyText(name: string, outfit: string, balance: number) {
  const first = name.trim().split(/\s+/)[0];
  const pay = balance > 0 ? ` The balance is ${money(balance)}.` : "";
  return `Hello ${first}! Good news: your ${outfit} is ready for pickup.${pay} Let me know when you'll come by. Thank you!`;
}

export function birthdayText(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return `Happy birthday ${first}! 🎉 Wishing you a wonderful year ahead. Thank you for being such a lovely customer!`;
}
