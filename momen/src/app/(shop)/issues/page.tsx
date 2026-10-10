import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate, toInputDate } from "@/lib/format";
import { addIssue, deleteIssue, resolveIssue } from "@/actions/misc";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Empty, PageHeader, Pill, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  const [issues, customers] = await Promise.all([
    db.issue.findMany({ include: { customer: true, order: true }, orderBy: [{ resolved: "asc" }, { date: "desc" }] }),
    db.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Issues" subtitle="Anything that went wrong — with a customer, a tailor, a supplier, a delivery." />
      <Section title="Log an issue">
        <form action={addIssue} className="grid sm:grid-cols-6 gap-2">
          <input name="title" placeholder="What happened?" className="input sm:col-span-3" required />
          <input name="date" type="date" className="input" defaultValue={toInputDate(new Date())} />
          <select name="customerId" className="input sm:col-span-2" defaultValue="">
            <option value="">No customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea name="details" placeholder="Details" rows={2} className="input sm:col-span-5" />
          <button className="btn-primary">Log</button>
        </form>
      </Section>

      <Section title="All issues">
        {issues.length === 0 ? (
          <Empty>Nothing has gone wrong. 🙌</Empty>
        ) : (
          <ul className="divide-y divide-line/60">
            {issues.map((i) => (
              <li key={i.id} className="py-3 grid md:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{i.title}</span>
                    <Pill tone={i.resolved ? "green" : "red"}>{i.resolved ? "resolved" : "open"}</Pill>
                  </div>
                  <div className="text-xs text-muted">
                    {fmtDate(i.date)}
                    {i.customer && <> · <Link href={`/customers/${i.customer.id}`} className="link">{i.customer.name}</Link></>}
                    {i.order && <> · <Link href={`/orders/${i.order.id}`} className="link">{i.order.title}</Link></>}
                  </div>
                  {i.details && <p className="text-sm whitespace-pre-wrap mt-1">{i.details}</p>}
                </div>
                <form action={resolveIssue.bind(null, i.id)} className="flex flex-wrap gap-2 items-start">
                  <input name="resolution" placeholder="How was it resolved?" defaultValue={i.resolution ?? ""} className="input flex-1 min-w-40" />
                  <label className="flex items-center gap-1 text-sm py-2">
                    <input type="checkbox" name="resolved" defaultChecked={i.resolved} /> Resolved
                  </label>
                  <button className="btn btn-sm py-2">Save</button>
                  <ConfirmButton message="Delete this issue?" className="btn-danger py-2" formAction={deleteIssue.bind(null, i.id)}>Delete</ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
