import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ORDER_COST_CATEGORIES, ORDER_PURPOSES, ORDER_STATUSES, PAYMENT_METHODS, PHOTO_KINDS, labelFor } from "@/lib/constants";
import { daysUntil, fmtDate, money, readyText, relativeDays, toInputDate, whatsappLink } from "@/lib/format";
import { deliveryDelta, isInHouse, needsDeposit, orderTotals, receiptText, rtwPieces } from "@/lib/orders";
import {
  addCost,
  addSize,
  deleteSize,
  sellPiece,
  setPortfolio,
  markCostPaid,
  markOrderPaid,
  addPayment,
  addPhotos,
  addPromise,
  deleteCost,
  deletePayment,
  deletePhoto,
  deletePromise,
  markDelivered,
  setOrderStatusForm,
  togglePromise,
  updateOrderNotes,
} from "@/actions/orders";
import { addIssue, addTask } from "@/actions/misc";
import { MeasurementCard } from "@/components/MeasurementCard";
import { TaskList } from "@/components/TaskList";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PhotoUploadForm } from "@/components/PhotoUploadForm";
import { MarkPaidButton } from "@/components/MarkPaidButton";
import { BackLink, Empty, Pill, Section, Select, Stat, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const o = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      measurement: true,
      payments: { orderBy: { paidAt: "asc" } },
      promises: { orderBy: { promisedDate: "asc" } },
      costs: { orderBy: { date: "asc" } },
      sizes: { orderBy: { id: "asc" } },
      photos: { orderBy: { createdAt: "asc" } },
      tasks: { include: { order: { include: { customer: true } } }, orderBy: [{ done: "asc" }, { dueDate: "asc" }] },
      issues: { orderBy: { date: "desc" } },
    },
  });
  if (!o) notFound();
  const workers = await db.orderCost.findMany({ where: { paidTo: { not: null } }, distinct: ["paidTo"], select: { paidTo: true } });

  const t = orderTotals(o);
  const delta = deliveryDelta(o);
  const today = toInputDate(new Date());
  const isOpen = !["DELIVERED", "CANCELLED"].includes(o.status);
  const inHouse = isInHouse(o);
  const rtw = o.purpose === "RTW";
  const pieces = rtw ? rtwPieces(o) : null;

  return (
    <div className="space-y-6">
      <BackLink href="/orders">Orders</BackLink>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h1">{o.title}{o.quantity > 1 ? ` ×${o.quantity}` : ""}</h1>
          <div className="text-sm text-muted mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
            {inHouse && <Pill tone="plum">{labelFor(ORDER_PURPOSES, o.purpose)}</Pill>}
            {o.customer && <Link href={`/customers/${o.customer.id}`} className="link font-medium">{inHouse ? `Model: ${o.customer.name}` : o.customer.name}</Link>}
            {o.customer?.phone && !inHouse && <a href={`tel:${o.customer.phone}`} className="link">{o.customer.phone}</a>}
            <StatusBadge status={o.status} />
            <span>Ordered {fmtDate(o.orderDate)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <form key={o.status} action={setOrderStatusForm.bind(null, id)} className="flex gap-2">
            <Select name="status" options={ORDER_STATUSES} defaultValue={o.status} />
            <button className="btn">Update</button>
          </form>
          {!inHouse && o.customer?.phone && o.status === "READY" && (
            <a href={whatsappLink(o.customer.phone, readyText(o.customer.name, o.title, t.balance))} target="_blank" className="btn-primary">Tell them it&apos;s ready</a>
          )}
          {!inHouse && o.customer?.phone && (
            <a href={whatsappLink(o.customer.phone, receiptText(o))} target="_blank" className="btn">Send receipt</a>
          )}
          {t.balance > 0 && <MarkPaidButton action={markOrderPaid.bind(null, id)} owed={t.balance} who={o.customer?.name ?? "Customer"} className="btn-primary" />}
          {!inHouse && <Link href={`/orders/${id}/receipt`} className="btn">Receipt</Link>}
          <Link href={`/orders/${id}/edit`} className="btn">Edit</Link>
        </div>
      </div>

      {needsDeposit(o) && (
        <p className="card border-red-300 bg-red-50 text-sm text-red-800">Work has started but no deposit has been paid yet. Ask for one before going further.</p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label={rtw ? "Expected sales" : "Price"} value={money(o.price)} />
        <Stat label={rtw ? "Sold so far" : "Paid"} value={money(t.paid)} />
        {inHouse ? (
          <Stat label={rtw ? "Still to sell" : "Balance"} value={rtw ? money(Math.max(0, o.price - t.paid)) : "In-house"} hint={rtw ? undefined : "nobody owes for this"} />
        ) : (
          <Stat label="Balance" value={t.balance > 0 ? money(t.balance) : "Fully paid"} tone={t.balance > 0 ? "bad" : "good"} />
        )}
        <Stat label="Costs" value={money(t.cost)} hint="tailor, embroidery, materials…" />
        <Stat label="Profit" value={money(t.profit)} tone={t.profit >= 0 ? "good" : "bad"} hint={o.price ? `${Math.round((t.profit / o.price) * 100)}% margin` : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Dates & delivery">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><dt className="label">Fitting</dt><dd>{fmtDate(o.fittingDate)}{o.fittingDate && isOpen && <div className="text-xs text-muted">{relativeDays(o.fittingDate)}</div>}</dd></div>
              <div>
                <dt className="label">Due</dt>
                <dd className={isOpen && o.dueDate && daysUntil(o.dueDate) < 0 ? "text-red-700 font-medium" : ""}>
                  {fmtDate(o.dueDate)}{o.dueDate && isOpen && <div className="text-xs">{relativeDays(o.dueDate)}</div>}
                </dd>
              </div>
              <div><dt className="label">Delivered</dt><dd>{fmtDate(o.deliveredAt)}</dd></div>
              <div>
                <dt className="label">Timing</dt>
                <dd>
                  {delta === null ? "—" : delta > 0 ? <Pill tone="green">{delta} day(s) early</Pill> : delta < 0 ? <Pill tone="red">{-delta} day(s) late</Pill> : <Pill tone="plum">On time</Pill>}
                </dd>
              </div>
            </dl>
            {isOpen && (
              <form action={markDelivered.bind(null, id)} className="flex gap-2 mt-4 no-print">
                <input name="deliveredAt" type="date" className="input w-44" defaultValue={today} />
                <button className="btn-primary">Mark delivered</button>
              </form>
            )}
            {o.description && <p className="text-sm whitespace-pre-wrap mt-4"><span className="label">Style details</span>{o.description}</p>}
            {o.fabricSource && <p className="text-sm mt-2"><span className="text-muted">Fabric: </span>{o.fabricSource}</p>}
            {o.notes && <p className="text-sm whitespace-pre-wrap mt-2"><span className="text-muted">Notes: </span>{o.notes}</p>}
          </Section>

          {pieces && (
            <Section title="Stock by size">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                <div><div className="label">Pieces left</div><div className="text-lg font-semibold tabular-nums">{pieces.left} <span className="text-sm text-muted font-normal">of {pieces.made}</span></div></div>
                <div><div className="label">Cost per piece</div><div className="text-lg tabular-nums">{money(pieces.costEach)}</div></div>
                <div><div className="label">Selling price</div><div className="text-lg tabular-nums">{money(pieces.priceEach)}</div></div>
                <div><div className="label">Profit per piece</div><div className={`text-lg tabular-nums ${pieces.profitEach >= 0 ? "text-emerald-700" : "text-red-700"}`}>{money(pieces.profitEach)}</div></div>
              </div>
              {o.sizes.length > 0 && (
                <table className="table mb-3">
                  <thead><tr><th>Size</th><th className="text-right">Made</th><th className="text-right">Sold</th><th className="text-right">Left</th><th /></tr></thead>
                  <tbody>
                    {o.sizes.map((z) => (
                      <tr key={z.id}>
                        <td className="font-medium">{z.size}</td>
                        <td className="text-right tabular-nums">{z.made}</td>
                        <td className="text-right tabular-nums">{z.sold}</td>
                        <td className={`text-right tabular-nums ${z.made - z.sold === 0 ? "text-muted" : "font-medium"}`}>{z.made - z.sold}</td>
                        <td className="w-8 no-print">
                          {z.sold === 0 && <form action={deleteSize.bind(null, id, z.id)}><ConfirmButton message={`Remove size ${z.size}?`} confirmLabel="Remove">×</ConfirmButton></form>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <form action={addSize.bind(null, id)} className="flex flex-wrap gap-2 no-print mb-4">
                <input name="size" placeholder="Size (S, M, 12…)" className="input w-36" required />
                <input name="made" type="number" min={1} placeholder="How many" className="input w-28" required />
                <button className="btn">Add pieces</button>
              </form>
              {o.sizes.some((z) => z.made > z.sold) && (
                <form key={pieces.priceEach} action={sellPiece.bind(null, id)} className="grid grid-cols-2 sm:grid-cols-5 gap-2 no-print border-t border-line pt-3">
                  <select name="sizeId" className="input" required>
                    {o.sizes.filter((z) => z.made > z.sold).map((z) => <option key={z.id} value={z.id}>{z.size} ({z.made - z.sold} left)</option>)}
                  </select>
                  <input name="amount" inputMode="numeric" className="input" defaultValue={pieces.priceEach || ""} placeholder="Price" required />
                  <Select name="method" options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} defaultValue="Transfer" />
                  <input name="buyer" placeholder="Buyer (optional)" className="input" />
                  <button className="btn-primary">Sell one</button>
                </form>
              )}
            </Section>
          )}

          <Section title={rtw ? "Sales" : "Payments"}>
            {o.payments.length === 0 ? (
              <Empty>No payments yet.</Empty>
            ) : (
              <table className="table mb-3">
                <tbody>
                  {o.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">{fmtDate(p.paidAt)}</td>
                      <td>{p.method}{p.note && <span className="text-muted"> · {p.note}</span>}</td>
                      <td className="text-right tabular-nums font-medium">{money(p.amount)}</td>
                      <td className="text-right w-8 no-print">
                        <form action={deletePayment.bind(null, id, p.id)}><ConfirmButton message="Delete this payment?">×</ConfirmButton></form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <form action={addPayment.bind(null, id)} className="grid grid-cols-2 sm:grid-cols-5 gap-2 no-print">
              <input name="amount" inputMode="numeric" placeholder={t.balance > 0 ? `${t.balance}` : "Amount"} className="input" required />
              <input name="paidAt" type="date" className="input" defaultValue={today} />
              <Select name="method" options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} defaultValue="Transfer" />
              <input name="note" placeholder="Note" className="input" />
              <button className="btn-primary col-span-2 sm:col-span-1">Add payment</button>
            </form>
          </Section>

          <Section title="Promises to pay">
            {o.promises.length === 0 ? (
              <Empty>No promises recorded.</Empty>
            ) : (
              <ul className="divide-y divide-line/60 mb-3">
                {o.promises.map((p) => {
                  const broken = !p.kept && daysUntil(p.promisedDate) < 0;
                  return (
                    <li key={p.id} className="py-2 flex items-center gap-3 text-sm">
                      <form action={togglePromise.bind(null, id, p.id, !p.kept)}>
                        <button className={`btn btn-sm ${p.kept ? "!bg-emerald-600 !text-white !border-emerald-600" : ""}`}>{p.kept ? "Kept ✓" : "Mark kept"}</button>
                      </form>
                      <div className="flex-1">
                        Promised {p.amount ? money(p.amount) : "the balance"} by <b>{fmtDate(p.promisedDate)}</b>
                        {broken && <span className="ml-2"><Pill tone="red">broken</Pill></span>}
                        {p.note && <div className="text-xs text-muted">{p.note}</div>}
                      </div>
                      <form action={deletePromise.bind(null, id, p.id)} className="no-print"><ConfirmButton message="Delete this promise?">×</ConfirmButton></form>
                    </li>
                  );
                })}
              </ul>
            )}
            <form action={addPromise.bind(null, id)} className="grid grid-cols-2 sm:grid-cols-4 gap-2 no-print">
              <input name="promisedDate" type="date" className="input" required />
              <input name="amount" inputMode="numeric" placeholder="Amount (blank = balance)" className="input" />
              <input name="note" placeholder="What they said" className="input" />
              <button className="btn">Add promise</button>
            </form>
          </Section>

          <Section title="Costs on this outfit">
            {o.costs.length === 0 ? (
              <Empty>No costs yet. Add what you pay the tailor, embroidery, button holes, fabric…</Empty>
            ) : (
              <table className="table mb-3">
                <tbody>
                  {o.costs.map((c) => (
                    <tr key={c.id}>
                      <td className="whitespace-nowrap">{fmtDate(c.date)}</td>
                      <td>
                        <span className="font-medium">{labelFor(ORDER_COST_CATEGORIES, c.category)}</span>
                        {c.paidTo && <span className="text-muted"> · {c.paidTo}</span>}
                        {!c.paidAt && <span className="ml-2"><Pill tone="red">owed</Pill></span>}
                        {c.note && <div className="text-xs text-muted">{c.note}</div>}
                      </td>
                      <td className="text-right tabular-nums">
                        {money(c.amount)}
                        {!c.paidAt && (
                          <form action={markCostPaid.bind(null, c.id)} className="no-print">
                            <button className="link text-xs">Mark paid</button>
                          </form>
                        )}
                      </td>
                      <td className="text-right w-8 no-print">
                        <form action={deleteCost.bind(null, id, c.id)}><ConfirmButton message="Delete this cost?">×</ConfirmButton></form>
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold"><td colSpan={2}>Total cost</td><td className="text-right tabular-nums">{money(t.cost)}</td><td /></tr>
                </tbody>
              </table>
            )}
            <form action={addCost.bind(null, id)} className="grid grid-cols-2 sm:grid-cols-3 gap-2 no-print">
              <Select name="category" options={ORDER_COST_CATEGORIES} defaultValue="TAILOR" />
              <input name="amount" inputMode="numeric" placeholder="Amount" className="input" required />
              <input name="date" type="date" className="input" defaultValue={today} />
              <input name="paidTo" placeholder="Paid to (e.g. tailor's name)" className="input" list="worker-names" />
              <datalist id="worker-names">{workers.map((w) => <option key={w.paidTo} value={w.paidTo!} />)}</datalist>
              <input name="note" placeholder="Note" className="input" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="owed" /> Not paid yet</label>
              <button className="btn-primary col-span-2 sm:col-span-2">Add cost</button>
            </form>
          </Section>

          <Section title="Photos">
            {o.photos.length === 0 ? (
              <Empty>No pictures yet.</Empty>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {o.photos.map((p) => (
                  <figure key={p.id} className="relative group">
                    <a href={`/api/photos/${p.filename}`} target="_blank">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/photos/${p.filename}`} alt={p.caption ?? o.title} className="aspect-[3/4] w-full object-cover rounded-lg border border-line" />
                    </a>
                    <figcaption className="text-xs mt-1 flex justify-between gap-1">
                      <span><Pill>{labelFor(PHOTO_KINDS, p.kind)}</Pill> {p.caption}</span>
                      <form action={deletePhoto.bind(null, id, p.id)} className="no-print"><ConfirmButton message="Delete this photo?">×</ConfirmButton></form>
                    </figcaption>
                    <form action={setPortfolio.bind(null, id, p.id, !p.portfolio)} className="no-print">
                      <button className={`text-xs ${p.portfolio ? "text-plum font-medium" : "text-muted hover:text-ink"}`}>
                        {p.portfolio ? "✓ In portfolio" : "+ Show in portfolio"}
                      </button>
                    </form>
                  </figure>
                ))}
              </div>
            )}
            <PhotoUploadForm action={addPhotos.bind(null, id)} />
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Fit & problems">
            <form key={`${o.fitNotes}|${o.problems}`} action={updateOrderNotes.bind(null, id)} className="space-y-3">
              <label className="block">
                <span className="label">Fit comments</span>
                <textarea name="fitNotes" rows={3} className="input" placeholder="e.g. Took in waist 1 inch, sleeves slightly long" defaultValue={o.fitNotes ?? ""} />
              </label>
              <label className="block">
                <span className="label">What went wrong</span>
                <textarea name="problems" rows={3} className="input" placeholder="e.g. Embroiderer delivered late, wrong colour lining" defaultValue={o.problems ?? ""} />
              </label>
              <button className="btn">Save notes</button>
            </form>
          </Section>

          {o.customerId && (
            <Section title="Measurements" actions={<Link href={`/customers/${o.customerId}/measurements/new`} className="link text-xs">+ New</Link>}>
              {o.measurement ? <MeasurementCard m={o.measurement} compact editHref={`/customers/${o.customerId}/measurements/${o.measurement.id}`} /> : <Empty>No measurements linked. Edit the order to pick one.</Empty>}
            </Section>
          )}

          <Section title="Tasks">
            <form action={addTask} className="grid grid-cols-[1fr_auto] gap-2 mb-2 no-print">
              <input type="hidden" name="orderId" value={id} />
              <input name="title" placeholder="e.g. Take to embroiderer" className="input col-span-2" required />
              <input name="dueDate" type="date" className="input" />
              <button className="btn">Add</button>
            </form>
            <TaskList tasks={o.tasks} showOrder={false} />
          </Section>

          <Section title="Issues">
            <form action={addIssue} className="space-y-2 mb-3 no-print">
              <input type="hidden" name="orderId" value={id} />
              <input name="title" placeholder="Log a problem…" className="input" required />
              <div className="flex gap-2">
                <input name="details" placeholder="Details" className="input" />
                <button className="btn">Log</button>
              </div>
            </form>
            {o.issues.length === 0 ? (
              <Empty>None.</Empty>
            ) : (
              <ul className="space-y-2 text-sm">
                {o.issues.map((i) => (
                  <li key={i.id}>
                    <span className="font-medium">{i.title}</span> <Pill tone={i.resolved ? "green" : "red"}>{i.resolved ? "resolved" : "open"}</Pill>
                    <div className="text-xs text-muted">{fmtDate(i.date)}</div>
                    {i.details && <p>{i.details}</p>}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/issues" className="link text-xs">Manage issues →</Link>
          </Section>
        </div>
      </div>
    </div>
  );
}
