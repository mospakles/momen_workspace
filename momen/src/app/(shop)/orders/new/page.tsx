import Link from "next/link";
import { db } from "@/lib/db";
import { createOrder } from "@/actions/orders";
import { OrderForm } from "@/components/OrderForm";
import { BackLink, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const cid = Number((await searchParams).customerId) || undefined;
  const customers = await db.customer.findMany({ orderBy: { name: "asc" } });
  const measurements = cid ? await db.measurement.findMany({ where: { customerId: cid }, orderBy: { takenAt: "desc" } }) : [];

  return (
    <div>
      <BackLink href={cid ? `/customers/${cid}` : "/orders"}>Back</BackLink>
      <PageHeader title="New order" subtitle={<>For a customer, a photoshoot, an advert or ready-to-wear stock. New customer? <Link href="/customers/new" className="link">Add them first</Link>.</>} />
      <OrderForm action={createOrder} customers={customers} customerId={cid} measurements={measurements} submitLabel="Create order" />
    </div>
  );
}
