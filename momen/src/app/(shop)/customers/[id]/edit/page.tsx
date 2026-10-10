import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { deleteCustomer, updateCustomer } from "@/actions/customers";
import { CustomerForm } from "@/components/CustomerForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { BackLink, PageHeader } from "@/components/ui";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) notFound();
  return (
    <div>
      <BackLink href={`/customers/${id}`}>{customer.name}</BackLink>
      <PageHeader title="Edit customer" />
      <CustomerForm action={updateCustomer.bind(null, id)} customer={customer} submitLabel="Save changes" />
      <form action={deleteCustomer.bind(null, id)} className="mt-6">
        <ConfirmButton message={`Delete ${customer.name} and ALL their orders, payments and measurements? This cannot be undone.`}>
          Delete customer
        </ConfirmButton>
      </form>
    </div>
  );
}
