import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtDate, fmtShortDate, money, normalizePhone, reminderText, toInputDate, whatsappLink } from "@/lib/format";
import { deliveryDelta, isInHouse, orderTotals } from "@/lib/orders";
import { ORDER_PURPOSES, labelFor } from "@/lib/constants";
import { deleteMeasurement } from "@/actions/customers";
import { addIssue } from "@/actions/misc";
import { markCustomerPaid } from "@/actions/orders";
import { MarkPaidButton } from "@/components/MarkPaidButton";
import { MeasurementCard } from "@/components/MeasurementCard";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Empty, PageHeader, Pill, Section, Stat, StatusBadge, BackLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ existing?: string }> }) {
  const id = Number((await params).id);
  const { existing } = await searchParams;
  const c = await db.customer.findUnique({
    where: { id },
    include: {
      measurements: { orderBy: { takenAt: "desc" } },
      orders: { include: { payments: true, costs: true, promises: true }, orderBy: { orderDate: "desc" } },
      issues: { orderBy: { date: "desc" }, include: { order: true } },
    },
  });
  if (!c) notFound();

  const phone = normalizePhone(c.phone);
  const duplicates = phone
    ? (await db.customer.findMany({ where: { id: { not: c.id }, phone: { not: null } } })).filter((d) => normalizePhone(d.phone) === phone)
    : [];

  // Outfits they modelled for the shop are listed but don't count as their spending.
  const active = c.orders.filter((o) => o.status !== "CANCELLED" && !isInHouse(o));
  const totals = active.map(orderTotals);
  const billed = active.reduce((s, o) => s + o.price, 0);
  const paid = totals.reduce((s, t) => s + t.paid, 0);
  const owes = totals.reduce((s, t) => s + Math.max(0, t.balance), 0);
  const profit = totals.reduce((s, t) => s + t.profit, 0);
  const brokenPromises = c.orders.flatMap((o) => o.promises).filter((p) => !p.kept && p.promisedDate < new Date()).length;
  const fitHistory = c.orders.filter((o) => o.fitNotes || o.problems);

  return (
    <div className="space-y-6">
      <BackLink href="/customers">Customers</BackLink>
      {existing && (
        <p className="card border-amber-300 bg-amber-50 text-sm text-amber-900">
          {c.name} is already saved with this phone number, so no new customer was created. This is their existing record.
        </p>
      )}
      {duplicates.length > 0 && (
        <p className="card border-amber-300 bg-amber-50 text-sm text-amber-900">
          Possible duplicate: {duplicates.map((d) => d.name).join(", ")} has the same phone number.{" "}
          <Link href={`/customers/${c.id}/edit`} className="link font-medium">Merge them</Link>
        </p>
      )}
      <PageHeader
        title={c.name}
        subtitle={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {c.phone && <a href={`tel:${c.phone}`} className="link">{c.phone}</a>}
            {c.phone && (
              <a href={whatsappLink(c.phone)} target="_blank" className="link">WhatsApp</a>
            )}
            {c.email && <a href={`mailto:${c.email}`} className="link">{c.email}</a>}
            {c.instagram && <span>{c.instagram}</span>}
            <span>Customer since {fmtDate(c.createdAt)}</span>
          </span>
        }
        actions={
          <>
            <Link href={`/orders/new?customerId=${c.id}`} className="btn-primary">+ New order</Link>
            {c.phone && owes > 0 && (
              <a
                href={whatsappLink(c.phone, reminderText(c.name, owes, active.filter((o) => orderTotals(o).balance > 0).map((o) => o.title)))}
                target="_blank"
                className="btn"
              >
                Remind to pay
              </a>
            )}
            {owes > 0 && <MarkPaidButton action={markCustomerPaid.bind(null, c.id)} owed={owes} who={c.name} className="btn" />}
            <Link href={`/customers/${c.id}/edit`} className="btn">Edit</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Orders" value={active.length} hint={`Billed ${money(billed)}`} />
        <Stat label="Paid you" value={money(paid)} />
        <Stat label="Owes" value={money(owes)} tone={owes > 0 ? "bad" : undefined} hint={brokenPromises ? `${brokenPromises} broken promise(s)` : undefined} />
        <Stat label="Your profit from them" value={money(profit)} tone={profit >= 0 ? "good" : "bad"} />
      </div>

      {(c.notes || c.address || c.birthday || c.referredBy) && (
        <Section title="Details">
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            {c.address && <div><dt className="label">Address</dt><dd>{c.address}</dd></div>}
            {c.birthday && <div><dt className="label">Birthday</dt><dd>{new Date(c.birthday).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</dd></div>}
            {c.referredBy && <div><dt className="label">Referred by</dt><dd>{c.referredBy}</dd></div>}
            {c.notes && <div className="sm:col-span-2"><dt className="label">Notes</dt><dd className="whitespace-pre-wrap">{c.notes}</dd></div>}
          </dl>
        </Section>
      )}

      <Section title="Orders">
        {c.orders.length === 0 ? (
          <Empty>No orders yet.</Empty>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="table">
              <thead>
                <tr><th>Outfit</th><th>Status</th><th>Due</th><th>Delivered</th><th className="text-right">Price</th><th className="text-right">Balance</th></tr>
              </thead>
              <tbody>
                {c.orders.map((o) => {
                  const t = orderTotals(o);
                  const delta = deliveryDelta(o);
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/orders/${o.id}`} className="link">{o.title}</Link>
                        {isInHouse(o) && <span className="ml-2"><Pill tone="plum">{labelFor(ORDER_PURPOSES, o.purpose)}</Pill></span>}
                        <div className="text-xs text-muted">{fmtDate(o.orderDate)}</div>
                      </td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="whitespace-nowrap">{fmtShortDate(o.dueDate)}</td>
                      <td className="whitespace-nowrap">
                        {fmtShortDate(o.deliveredAt)}
                        {delta !== null && delta > 0 && <div><Pill tone="green">{delta}d early</Pill></div>}
                        {delta !== null && delta < 0 && <div><Pill tone="red">{-delta}d late</Pill></div>}
                      </td>
                      <td className="text-right tabular-nums">{money(o.price)}</td>
                      <td className={`text-right tabular-nums ${t.balance > 0 ? "text-red-700 font-medium" : "text-muted"}`}>{t.balance > 0 ? money(t.balance) : isInHouse(o) ? "—" : "Paid"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Measurements" actions={<Link href={`/customers/${c.id}/measurements/new`} className="btn btn-sm">+ New measurements</Link>}>
        <div id="measurements" />
        {c.measurements.length === 0 ? (
          <Empty>No measurements yet.</Empty>
        ) : (
          <div className="space-y-3">
            {c.measurements.map((m, i) => (
              <div key={m.id}>
                {i === 1 && <div className="label mt-4">Older measurements</div>}
                <MeasurementCard m={m} editHref={`/customers/${c.id}/measurements/${m.id}`} />
                {i > 0 && (
                  <form action={deleteMeasurement.bind(null, c.id, m.id)} className="text-right">
                    <ConfirmButton message="Delete this set of measurements?">Delete</ConfirmButton>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Fit comments & problems (from orders)">
          {fitHistory.length === 0 ? (
            <Empty>Nothing recorded yet.</Empty>
          ) : (
            <ul className="space-y-3 text-sm">
              {fitHistory.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="link font-medium">{o.title}</Link> <span className="text-muted">· {fmtDate(o.orderDate)}</span>
                  {o.fitNotes && <p className="whitespace-pre-wrap"><span className="text-muted">Fit: </span>{o.fitNotes}</p>}
                  {o.problems && <p className="whitespace-pre-wrap text-red-700"><span className="text-muted">Problem: </span>{o.problems}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Issues with this customer">
          <form action={addIssue} className="space-y-2 mb-4">
            <input type="hidden" name="customerId" value={c.id} />
            <input name="title" placeholder="What happened? e.g. Refused to pay balance" className="input" required />
            <div className="flex gap-2">
              <input name="date" type="date" className="input w-40" defaultValue={toInputDate(new Date())} />
              <input name="details" placeholder="Details (optional)" className="input" />
              <button className="btn-primary">Log</button>
            </div>
          </form>
          {c.issues.length === 0 ? (
            <Empty>No issues. 👍</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {c.issues.map((i) => (
                <li key={i.id} className="border-l-2 pl-3 border-line">
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="font-medium">{i.title}</span>
                    <Pill tone={i.resolved ? "green" : "red"}>{i.resolved ? "resolved" : "open"}</Pill>
                  </div>
                  <div className="text-xs text-muted">{fmtDate(i.date)}{i.order && <> · <Link href={`/orders/${i.order.id}`} className="link">{i.order.title}</Link></>}</div>
                  {i.details && <p className="whitespace-pre-wrap">{i.details}</p>}
                  {i.resolution && <p className="text-emerald-700">→ {i.resolution}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
