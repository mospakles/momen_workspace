import { db } from "./db";

// Business details shown on invoices, receipts and the portfolio. Stored in the Setting table;
// the env vars are only fallbacks from before the Business details page existed.
export const BUSINESS_FIELDS = [
  { key: "name", label: "Business name", fallback: process.env.SHOP_NAME ?? "Momen Clothing" },
  { key: "phone", label: "Phone / WhatsApp", fallback: process.env.SHOP_WHATSAPP ?? "" },
  { key: "email", label: "Email", fallback: "" },
  { key: "address", label: "Address", fallback: "" },
  { key: "instagram", label: "Instagram", fallback: process.env.SHOP_INSTAGRAM ?? "" },
  { key: "bankName", label: "Bank", fallback: "" },
  { key: "accountName", label: "Account name", fallback: "" },
  { key: "accountNumber", label: "Account number", fallback: "" },
  { key: "invoiceDueDays", label: "Invoices due after (days)", fallback: "7" },
  { key: "invoiceNotes", label: "Note at the bottom of invoices", fallback: "Thank you for choosing Momen. Work begins once the deposit is paid." },
] as const;

export type BusinessKey = (typeof BUSINESS_FIELDS)[number]["key"];
export type Business = Record<BusinessKey, string>;

export async function getBusiness(): Promise<Business> {
  const rows = await db.setting.findMany();
  const saved = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(BUSINESS_FIELDS.map((f) => [f.key, saved[f.key] ?? f.fallback])) as Business;
}
