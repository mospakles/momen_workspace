import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtDate, money } from "@/lib/format";
import { SHOP_NAME, orderTotals } from "@/lib/orders";
import { PrintButton } from "@/components/PrintButton";
import { BackLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const o = await db.order.findUnique({ where: { id }, include: { customer: true, payments: { orderBy: { paidAt: "asc" } }, costs: true } });
  if (!o) notFound();
  const t = orderTotals(o);

  return (
    <div className="max-w-md">
      <div className="flex justify-between items-center no-print">
        <BackLink href={`/orders/${id}`}>Back to order</BackLink>
        <PrintButton />
      </div>
      <div className="card p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-display text-2xl text-plum">{SHOP_NAME}</div>
            <div className="text-xs text-muted">Receipt #{o.id}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium">{o.customer?.name}</div>
            {o.customer?.phone && <div className="text-muted">{o.customer.phone}</div>}
            <div className="text-muted">{fmtDate(new Date())}</div>
          </div>
        </div>

        <div className="flex justify-between border-y border-line py-3">
          <div>
            <div className="font-medium">{o.title}{o.quantity > 1 ? ` ×${o.quantity}` : ""}</div>
            <div className="text-xs text-muted">Ordered {fmtDate(o.orderDate)}</div>
          </div>
          <div className="tabular-nums font-medium">{money(o.price)}</div>
        </div>

        <div>
          <div className="label">Payments</div>
          {o.payments.length === 0 ? (
            <p className="text-sm text-muted">No payments yet.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {o.payments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{fmtDate(p.paidAt)}{p.method ? ` · ${p.method}` : ""}{p.note ? ` · ${p.note}` : ""}</span>
                  <span className="tabular-nums">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-line pt-3 space-y-1">
          <div className="flex justify-between text-sm"><span>Total paid</span><span className="tabular-nums">{money(t.paid)}</span></div>
          <div className={`flex justify-between font-semibold ${t.balance > 0 ? "text-red-700" : "text-emerald-700"}`}>
            <span>{t.balance > 0 ? "Balance due" : "Fully paid"}</span>
            <span className="tabular-nums">{money(Math.max(0, t.balance))}</span>
          </div>
        </div>
        <p className="text-center text-sm text-muted pt-2">Thank you for your patronage!</p>
      </div>
    </div>
  );
}
