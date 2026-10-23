import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { deleteOrder, updateOrder } from "@/actions/orders";
import { orderWho } from "@/lib/orders";
import { OrderForm } from "@/components/OrderForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { BackLink, PageHeader } from "@/components/ui";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const order = await db.order.findUnique({ where: { id }, include: { customer: true } });
  if (!order) notFound();
  const [customers, measurements] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" } }),
    order.customerId ? db.measurement.findMany({ where: { customerId: order.customerId }, orderBy: { takenAt: "desc" } }) : [],
  ]);
  return (
    <div>
      <BackLink href={`/orders/${id}`}>Back to order</BackLink>
      <PageHeader title={`Edit order · ${orderWho(order)}`} />
      <OrderForm action={updateOrder.bind(null, id)} order={order} customers={customers} measurements={measurements} submitLabel="Save changes" />
      <form action={deleteOrder.bind(null, id)} className="mt-6">
        <ConfirmButton message="Delete this order with all its payments, costs and photos? You can restore it from the Bin for 30 days.">Delete order</ConfirmButton>
      </form>
    </div>
  );
}
