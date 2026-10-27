import type { Business } from "@/lib/settings";
import { fmtDate, money } from "@/lib/format";

export type InvoiceLine = { title: string; detail?: string | null; qty: number; amount: number };

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
  const bank = [business.bankName, business.accountName, business.accountNumber].filter(Boolean);

  return (
    <article className="invoice bg-white text-[#111] border border-line rounded-xl p-6 sm:p-10 space-y-8">
      <header className="flex flex-wrap justify-between gap-6">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/momen-logo.png" alt={business.name} className="h-9 sm:h-11 w-auto" />
          <div className="text-[10px] tracking-[0.45em] uppercase mt-1 text-neutral-600">Clothing</div>
          <div className="text-xs text-neutral-600 mt-3 space-y-0.5 whitespace-pre-line">
            {business.address && <div>{business.address}</div>}
            {[business.phone, business.email].filter(Boolean).join(" · ") && <div>{[business.phone, business.email].filter(Boolean).join(" · ")}</div>}
            {business.instagram && <div>{business.instagram}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold tracking-[0.2em]">INVOICE</div>
          <dl className="text-sm mt-3 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 justify-end">
            <dt className="text-neutral-500">Invoice no.</dt><dd className="font-medium">{number}</dd>
            <dt className="text-neutral-500">Date</dt><dd>{fmtDate(issued)}</dd>
            <dt className="text-neutral-500">Payment due</dt><dd>{fmtDate(due)}</dd>
          </dl>
        </div>
      </header>

      <section>
        <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1">Bill to</div>
        <div className="font-semibold">{billTo.name}</div>
        <div className="text-sm text-neutral-600">
          {[billTo.phone, billTo.email].filter(Boolean).join(" · ")}
          {billTo.address && <div>{billTo.address}</div>}
        </div>
      </section>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-[#111] text-left text-[11px] uppercase tracking-widest">
            <th className="py-2">Item</th>
            <th className="py-2 text-right w-14">Qty</th>
            <th className="py-2 text-right w-28 hidden sm:table-cell">Unit price</th>
            <th className="py-2 text-right w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-neutral-200 align-top">
              <td className="py-3 pr-2">
                <div className="font-medium">{l.title}</div>
                {l.detail && <div className="text-xs text-neutral-500 whitespace-pre-line">{l.detail}</div>}
              </td>
              <td className="py-3 text-right tabular-nums">{l.qty}</td>
              <td className="py-3 text-right tabular-nums hidden sm:table-cell">{money(Math.round(l.amount / Math.max(1, l.qty)))}</td>
              <td className="py-3 text-right tabular-nums">{money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <dl className="w-full max-w-xs text-sm space-y-1.5">
          <div className="flex justify-between"><dt>Total</dt><dd className="tabular-nums">{money(total)}</dd></div>
          <div className="flex justify-between text-neutral-600"><dt>Paid</dt><dd className="tabular-nums">−{money(paid)}</dd></div>
          <div className="flex justify-between border-t-2 border-[#111] pt-2 text-lg font-semibold">
            <dt>{balance > 0 ? "Balance due" : "Paid in full"}</dt>
            <dd className="tabular-nums">{money(balance)}</dd>
          </div>
        </dl>
      </div>

      <footer className="grid sm:grid-cols-2 gap-6 text-sm border-t border-neutral-200 pt-6">
        {bank.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1">Pay to</div>
            {business.bankName && <div>{business.bankName}</div>}
            {business.accountName && <div>{business.accountName}</div>}
            {business.accountNumber && <div className="font-semibold tracking-wider">{business.accountNumber}</div>}
          </div>
        )}
        {business.invoiceNotes && <p className="text-neutral-600 whitespace-pre-line sm:text-right">{business.invoiceNotes}</p>}
      </footer>
    </article>
  );
}
