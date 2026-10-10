import type { Customer } from "@prisma/client";
import { toInputDate } from "@/lib/format";
import { Field } from "./ui";

export function CustomerForm({ action, customer, submitLabel }: { action: (fd: FormData) => Promise<void>; customer?: Customer; submitLabel: string }) {
  return (
    <form action={action} className="card space-y-4 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name *" className="sm:col-span-2">
          <input name="name" className="input" required defaultValue={customer?.name} autoFocus />
        </Field>
        <Field label="Phone / WhatsApp">
          <input name="phone" type="tel" className="input" defaultValue={customer?.phone ?? ""} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" className="input" defaultValue={customer?.email ?? ""} />
        </Field>
        <Field label="Instagram">
          <input name="instagram" className="input" placeholder="@handle" defaultValue={customer?.instagram ?? ""} />
        </Field>
        <Field label="Birthday">
          <input name="birthday" type="date" className="input" defaultValue={toInputDate(customer?.birthday)} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <input name="address" className="input" defaultValue={customer?.address ?? ""} />
        </Field>
        <Field label="Referred by / how they found you" className="sm:col-span-2">
          <input name="referredBy" className="input" defaultValue={customer?.referredBy ?? ""} />
        </Field>
        <Field label="Notes (style preferences, how they like their fit, anything to remember)" className="sm:col-span-2">
          <textarea name="notes" rows={4} className="input" defaultValue={customer?.notes ?? ""} />
        </Field>
      </div>
      <button className="btn-primary">{submitLabel}</button>
    </form>
  );
}
