import { Poppins } from "next/font/google";
import type { Business } from "@/lib/settings";
import { fmtDate, money } from "@/lib/format";

// A geometric sans to sit with the wordmark.
const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500"], display: "swap" });

export type InvoiceLine = { title: string; detail?: string | null; qty: number; amount: number };

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9px] font-medium uppercase tracking-[0.3em] text-neutral-400 mb-2">{children}</div>
);

/** A printable, branded invoice. Sized for A4 when printed / saved as PDF. */
export function InvoiceDocument({
  business,
  number,
  issued,
  due,
  billTo,
  lines,
  paid,
}: {
  business: Business;
  number: string;
  issued: Date;
  due: Date;
  billTo: { name: string; phone?: string | null; email?: string | null; address?: string | null };
  lines: InvoiceLine[];
  paid: number;
}) {
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const balance = Math.max(0, total - paid);
  const settled = balance === 0;
  const hasBank = Boolean(business.bankName || business.accountName || business.accountNumber);
  const contacts = [business.phone, business.email, business.instagram].filter(Boolean);

  return (
    <article className={`invoice ${poppins.className} bg-white text-neutral-900 border border-line rounded-xl px-6 py-8 sm:px-12 sm:py-12 font-light`}>
      <header className="flex flex-wrap items-start justify-between gap-8">
        {/* Wordmark with CLOTHINGS spread to its width, as on the tags. */}
        <div className="inline-flex flex-col">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/momen-logo.png" alt={business.name} className="h-8 sm:h-10 w-auto" />
          <div className="flex justify-between pl-[3%] pr-[9%] mt-1.5 text-[8px] sm:text-[9px] font-normal text-neutral-500" aria-label="Clothings">
            {"CLOTHINGS".split("").map((ch, i) => <span key={i}>{ch}</span>)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl sm:text-[28px] font-light tracking-[0.35em] mr-[-0.35em]">INVOICE</div>
          <div className={`inline-block mt-3 px-2.5 py-0.5 rounded-full border text-[9px] font-medium tracking-[0.25em] ${settled ? "border-neutral-300 text-neutral-500" : "border-neutral-900 text-neutral-900"}`}>
            {settled ? "PAID" : "DUE"}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 text-sm">
        <div className="col-span-2">
          <Label>Billed to</Label>
          <div className="font-normal text-base">{billTo.name}</div>
          <div className="text-neutral-500 text-[13px] leading-relaxed">
            {billTo.phone && <div>{billTo.phone}</div>}
            {billTo.email && <div>{billTo.email}</div>}
            {billTo.address && <div>{billTo.address}</div>}
          </div>
        </div>
        <div>
          <Label>Invoice no.</Label>
          <div className="font-normal">{number}</div>
          <div className="text-neutral-500 text-[13px] mt-3">Issued {fmtDate(issued)}</div>
        </div>
        <div className="sm:text-right">
          <Label>Payment due</Label>
          <div className="font-normal">{fmtDate(due)}</div>
        </div>
      </section>

      <table className="w-full text-sm mt-12">
        <thead>
          <tr className="border-b border-neutral-900 text-left">
            <th className="pb-3 font-medium text-[9px] uppercase tracking-[0.3em] text-neutral-500">Item</th>
            <th className="pb-3 font-medium text-[9px] uppercase tracking-[0.3em] text-neutral-500 text-right w-12">Qty</th>
            <th className="pb-3 font-medium text-[9px] uppercase tracking-[0.3em] text-neutral-500 text-right w-28 hidden sm:table-cell">Price</th>
            <th className="pb-3 font-medium text-[9px] uppercase tracking-[0.3em] text-neutral-500 text-right w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-neutral-200 align-top">
              <td className="py-4 pr-3">
                <div className="font-normal">{l.title}</div>
                {l.detail && <div className="text-xs text-neutral-500 whitespace-pre-line mt-0.5 leading-relaxed">{l.detail}</div>}
              </td>
              <td className="py-4 text-right tabular-nums">{l.qty}</td>
              <td className="py-4 text-right tabular-nums hidden sm:table-cell">{money(Math.round(l.amount / Math.max(1, l.qty)))}</td>
              <td className="py-4 text-right tabular-nums">{money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mt-6">
        <dl className="w-full max-w-[17rem] text-sm">
          <div className="flex justify-between py-1.5"><dt className="text-neutral-500">Subtotal</dt><dd className="tabular-nums">{money(total)}</dd></div>
          {paid > 0 && (
            <div className="flex justify-between py-1.5"><dt className="text-neutral-500">Paid</dt><dd className="tabular-nums">−{money(paid)}</dd></div>
          )}
          <div className="flex justify-between items-baseline border-t border-neutral-900 mt-2 pt-3">
            <dt className="text-[9px] font-medium uppercase tracking-[0.3em]">{settled ? "Paid in full" : "Balance due"}</dt>
            <dd className="text-xl font-normal tabular-nums">{money(balance)}</dd>
          </div>
        </dl>
      </div>

      {(hasBank || business.invoiceNotes) && (
        <section className={`grid gap-8 mt-14 text-[13px] ${hasBank ? "sm:grid-cols-2" : ""}`}>
          {hasBank && (
            <div>
              <Label>Payment details</Label>
              <div className="leading-relaxed">
                {business.bankName && <div>{business.bankName}</div>}
                {business.accountName && <div>{business.accountName}</div>}
                {business.accountNumber && <div className="font-normal tracking-[0.15em] mt-0.5">{business.accountNumber}</div>}
              </div>
            </div>
          )}
          {business.invoiceNotes && (
            <div>
              <Label>Note</Label>
              <p className="text-neutral-500 whitespace-pre-line leading-relaxed">{business.invoiceNotes}</p>
            </div>
          )}
        </section>
      )}

      <footer className="mt-14 pt-5 border-t border-neutral-200 flex flex-wrap justify-between gap-2 text-[11px] text-neutral-400">
        <span className="tracking-[0.2em] uppercase">{business.name}</span>
        <span className="text-right">
          {[business.address, ...contacts].filter(Boolean).join("  ·  ") || "Thank you"}
        </span>
      </footer>
    </article>
  );
}
