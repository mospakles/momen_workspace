import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { deleteCustomer, mergeCustomer, updateCustomer } from "@/actions/customers";
import { CustomerForm } from "@/components/CustomerForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { BackLink, PageHeader, Section } from "@/components/ui";

export default async function EditCustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ clash?: string }> }) {
  const id = Number((await params).id);
  const clashId = Number((await searchParams).clash) || null;
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  // Likely duplicates (same phone) first, then everyone else.
  const phone = normalizePhone(customer.phone);
  const others = (await db.customer.findMany({ where: { id: { not: id } }, include: { _count: { select: { orders: true } } }, orderBy: { name: "asc" } }))
    .map((c) => ({ ...c, samePhone: !!phone && normalizePhone(c.phone) === phone }))
    .sort((a, b) => Number(b.samePhone) - Number(a.samePhone));
  const clash = others.find((c) => c.id === clashId);
  const suggested = clash ?? others.find((c) => c.samePhone);

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={`/customers/${id}`}>{customer.name}</BackLink>
        <PageHeader title="Edit customer" />
        {clash && (
          <p className="card border-red-300 bg-red-50 text-sm text-red-800 mb-4 max-w-2xl">
            Not saved: <strong>{clash.name}</strong> already has the phone number {clash.phone}. If they&apos;re the same person, merge them below.
          </p>
        )}
        <CustomerForm action={updateCustomer.bind(null, id)} customer={customer} submitLabel="Save changes" />
      </div>

      {others.length > 0 && (
        <Section title="Merge a duplicate into this customer" className="max-w-2xl">
          <p className="text-sm text-muted mb-3">
            Moves the duplicate&apos;s orders, payments, measurements and issues onto {customer.name}, fills in any details missing here, then deletes the duplicate.
          </p>
          <form action={mergeCustomer.bind(null, id)} className="flex flex-wrap gap-2">
            <select name="mergeId" className="input flex-1 min-w-56" required defaultValue={suggested?.id ?? ""}>
              <option value="">Choose the duplicate…</option>
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.phone ? ` · ${c.phone}` : ""} · {c._count.orders} order{c._count.orders === 1 ? "" : "s"}{c.samePhone ? " (same phone)" : ""}
                </option>
              ))}
            </select>
            <ConfirmButton className="btn-primary" confirmLabel="Merge" danger={false} message={`Merge the selected customer into ${customer.name}? The duplicate record will be deleted.`}>
              Merge
            </ConfirmButton>
          </form>
        </Section>
      )}

      <form action={deleteCustomer.bind(null, id)}>
        <ConfirmButton message={`Delete ${customer.name} and ALL their orders, payments and measurements? This cannot be undone.`}>
          Delete customer
        </ConfirmButton>
      </form>
    </div>
  );
}
