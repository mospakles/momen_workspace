import type { Customer, Measurement, Order } from "@prisma/client";
import { ORDER_STATUSES, PAYMENT_METHODS } from "@/lib/constants";
import { fmtDate, toInputDate } from "@/lib/format";
import { Field, Select } from "./ui";

type Props = {
  action: (fd: FormData) => Promise<void>;
  order?: Order;
  customers?: Customer[]; // only for new orders
  customerId?: number;
  measurements: Measurement[];
  submitLabel: string;
};

export function OrderForm({ action, order, customers, customerId, measurements, submitLabel }: Props) {
  const isNew = !order;
  return (
    <form action={action} className="card space-y-4 max-w-3xl">
      <div className="grid sm:grid-cols-2 gap-4">
        {isNew && customers && (
          <Field label="Customer *" className="sm:col-span-2">
            <select name="customerId" className="input" required defaultValue={customerId ?? ""}>
              <option value="">Choose a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Outfit / style *" className="sm:col-span-2">
          <input name="title" className="input" required placeholder="e.g. Corset gown, Agbada, Aso-ebi blouse & wrapper" defaultValue={order?.title} />
        </Field>
        <Field label="Description / style details" className="sm:col-span-2">
          <textarea name="description" rows={3} className="input" defaultValue={order?.description ?? ""} />
        </Field>
        <Field label="Fabric">
          <input name="fabricSource" className="input" list="fabric-sources" placeholder="Customer's fabric / Bought by me" defaultValue={order?.fabricSource ?? ""} />
          <datalist id="fabric-sources">
            <option value="Customer brought fabric" />
            <option value="I bought the fabric" />
          </datalist>
        </Field>
        <Field label="Quantity">
          <input name="quantity" type="number" min={1} className="input" defaultValue={order?.quantity ?? 1} />
        </Field>
        <Field label="Price charged (₦)">
          <input name="price" inputMode="numeric" className="input" defaultValue={order?.price || ""} placeholder="0" />
        </Field>
        <Field label="Status">
          <Select name="status" options={ORDER_STATUSES} defaultValue={order?.status ?? "PENDING"} />
        </Field>

        {isNew && (
          <>
            <Field label="Deposit paid now (₦)">
              <input name="deposit" inputMode="numeric" className="input" placeholder="0" />
            </Field>
            <Field label="Deposit method">
              <Select name="depositMethod" options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} defaultValue="Transfer" />
            </Field>
          </>
        )}

        <Field label="Order date">
          <input name="orderDate" type="date" className="input" defaultValue={toInputDate(order?.orderDate ?? new Date())} />
        </Field>
        <Field label="Due date">
          <input name="dueDate" type="date" className="input" defaultValue={toInputDate(order?.dueDate)} />
        </Field>
        <Field label="Fitting date">
          <input name="fittingDate" type="date" className="input" defaultValue={toInputDate(order?.fittingDate)} />
        </Field>
        {!isNew && (
          <Field label="Delivered on">
            <input name="deliveredAt" type="date" className="input" defaultValue={toInputDate(order?.deliveredAt)} />
          </Field>
        )}

        {measurements.length > 0 && (
          <Field label="Measurements used" className="sm:col-span-2">
            <select name="measurementId" className="input" defaultValue={order?.measurementId ?? measurements[0]?.id ?? ""}>
              <option value="">—</option>
              {measurements.map((m) => (
                <option key={m.id} value={m.id}>Taken {fmtDate(m.takenAt)}</option>
              ))}
            </select>
          </Field>
        )}

        {!isNew && (
          <>
            <Field label="Fit comments" className="sm:col-span-2">
              <textarea name="fitNotes" rows={2} className="input" defaultValue={order?.fitNotes ?? ""} />
            </Field>
            <Field label="Problems / what went wrong" className="sm:col-span-2">
              <textarea name="problems" rows={2} className="input" defaultValue={order?.problems ?? ""} />
            </Field>
          </>
        )}
        <Field label="Other notes" className="sm:col-span-2">
          <textarea name="notes" rows={2} className="input" defaultValue={order?.notes ?? ""} />
        </Field>
      </div>
      <button className="btn-primary">{submitLabel}</button>
    </form>
  );
}
