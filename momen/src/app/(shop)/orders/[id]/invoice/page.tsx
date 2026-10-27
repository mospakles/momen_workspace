import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { whatsappLink } from "@/lib/format";
import { invoiceDue, invoiceNumber, invoiceText, isInHouse, orderTotals } from "@/lib/orders";
import { getBusiness } from "@/lib/settings";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { PrintButton } from "@/components/PrintButton";
import { BackLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OrderInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const [o, business] = await Promise.all([
    db.order.findUnique({ where: { id }, include: { customer: true, payments: true, costs: true } }),
    getBusiness(),
  ]);
  if (!o || !o.customer || isInHouse(o)) notFound();

  const issued = new Date();
  const due = invoiceDue(issued, business.invoiceDueDays);
  const number = invoiceNumber(o.id);
  const lines = [{ title: o.title, detail: [o.description, o.dueDate ? `Ready by ${o.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : null].filter(Boolean).join("\n"), qty: o.quantity, amount: o.price }];
  const { paid } = orderTotals(o);
  const bank = [business.bankName, business.accountName, business.accountNumber].filter(Boolean);

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2 no-print">
        <BackLink href={`/orders/${id}`}>Back to order</BackLink>
        <div className="flex gap-2">
          {o.customer.phone && (
            <a href={whatsappLink(o.customer.phone, invoiceText({ shopName: business.name, number, customer: o.customer.name, lines, paid, due, bank }))} target="_blank" className="btn btn-sm">
              Send on WhatsApp
            </a>
          )}
          <PrintButton />
        </div>
      </div>
      {!bank.length && <p className="no-print text-xs text-muted">Tip: add your bank account under Business details so it shows on invoices.</p>}
      <InvoiceDocument business={business} number={number} issued={issued} due={due} billTo={o.customer} lines={lines} paid={paid} />
    </div>
  );
}
