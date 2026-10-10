// Helpers for reading values out of FormData in server actions.

export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function reqStr(fd: FormData, key: string): string {
  const v = str(fd, key);
  if (!v) throw new Error(`${key} is required`);
  return v;
}

export function int(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Math.round(Number(v.replace(/[,₦\s]/g, "")));
  return Number.isFinite(n) ? n : null;
}

export function date(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  if (!v) return null;
  // Parse yyyy-mm-dd as local midday so timezone shifts never move the day.
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === "on" || fd.get(key) === "true";
}
