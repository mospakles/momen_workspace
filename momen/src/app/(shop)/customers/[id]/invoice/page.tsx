import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toInputDate, whatsappLink } from "@/lib/format";
import { invoiceDue, invoiceText, orderTotals } from "@/lib/orders";
import { getBusiness } from "@/lib/settings";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { PrintButton } from "@/components/PrintButton";
import { BackLink, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

/** One invoice for everything a customer still owes, across all their orders. */
export default async function CustomerInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const [c, business] = await Promise.all([
    db.customer.findUnique({
      where: { id },
      include: { orders: { where: { purpose: "CUSTOMER", status: { not: "CANCELLED" } }, include: { payments: true, costs: true }, orderBy: { orderDate: "asc" } } },
    }),
    getBusiness(),
  ]);
  if (!c) notFound();

  const owing = c.orders.filter((o) => orderTotals(o).balance > 0);
  const issued = new Date();
  const due = invoiceDue(issued, business.invoiceDueDays);
  const number = `INV-C${String(c.id).padStart(3, "0")}-${toInputDate(issued).replace(/-/g, "")}`;
  const lines = owing.map((o) => ({ title: o.title, detail: `Order #${o.id}`, qty: o.quantity, amount: o.price }));
  const paid = owing.reduce((s, o) => s + orderTotals(o).paid, 0);
  const bank = [business.bankName, business.accountName, business.accountNumber].filter(Boolean);

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2 no-print">
        <BackLink href={`/customers/${id}`}>{c.name}</BackLink>
        {owing.length > 0 && (
          <div className="flex gap-2">
            {c.phone && (
              <a href={whatsappLink(c.phone, invoiceText({ shopName: business.name, number, customer: c.name, lines, paid, due, bank }))} target="_blank" className="btn btn-sm">
                Send on WhatsApp
              </a>
            )}
            <PrintButton />
          </div>
        )}
      </div>
      {owing.length === 0 ? (
        <Empty>{c.name} doesn&apos;t owe anything, so there&apos;s nothing to invoice. Open an order to invoice it on its own.</Empty>
      ) : (
        <InvoiceDocument business={business} number={number} issued={issued} due={due} billTo={c} lines={lines} paid={paid} />
      )}
    </div>
  );
}
