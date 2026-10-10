import { createCustomer } from "@/actions/customers";
import { CustomerForm } from "@/components/CustomerForm";
import { BackLink, PageHeader } from "@/components/ui";

export default function NewCustomerPage() {
  return (
    <div>
      <BackLink href="/customers">Customers</BackLink>
      <PageHeader title="New customer" />
      <CustomerForm action={createCustomer} submitLabel="Save customer" />
    </div>
  );
}
