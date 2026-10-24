import Link from "next/link";
import { db } from "@/lib/db";
import { createOrder } from "@/actions/orders";
import { ORDER_PURPOSES, labelFor } from "@/lib/constants";
import { OrderForm } from "@/components/OrderForm";
import { BackLink, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ customerId?: string; purpose?: string }> }) {
  const sp = await searchParams;
  const cid = Number(sp.customerId) || undefined;
  // From the In-house page: start as a ready-to-wear batch, shoot or ad.
  const purpose = ORDER_PURPOSES.some((p) => p.value === sp.purpose && p.value !== "CUSTOMER") ? sp.purpose : undefined;
  const customers = await db.customer.findMany({ orderBy: { name: "asc" } });
  const measurements = cid ? await db.measurement.findMany({ where: { customerId: cid }, orderBy: { takenAt: "desc" } }) : [];

  return (
    <div>
      <BackLink href={cid ? `/customers/${cid}` : purpose ? "/in-house" : "/orders"}>Back</BackLink>
      <PageHeader
        title={purpose ? `New ${labelFor(ORDER_PURPOSES, purpose).toLowerCase()}` : "New order"}
        subtitle={purpose ? "In-house work: costs are tracked, nobody owes for it." : <>New customer? <Link href="/customers/new" className="link">Add them first</Link>.</>}
      />
      <OrderForm action={createOrder} customers={customers} customerId={cid} purpose={purpose} measurements={measurements} submitLabel={purpose ? "Create" : "Create order"} />
    </div>
  );
}
