import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { rtwPieces } from "@/lib/orders";
import { addMaterial, adjustMaterial, deleteMaterial } from "@/actions/misc";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Empty, Field, PageHeader, Pill, Section, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

const UNITS = ["yards", "metres", "pieces", "rolls", "packs", "cones"];
const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default async function StockPage() {
  const [materials, batches] = await Promise.all([
    db.material.findMany({ orderBy: { name: "asc" } }),
    db.order.findMany({ where: { purpose: "RTW", status: { not: "CANCELLED" } }, include: { sizes: true, costs: true }, orderBy: { orderDate: "desc" } }),
  ]);
  const low = materials.filter((m) => m.lowAt !== null && m.quantity <= m.lowAt);
  const rtw = batches.map((o) => ({ o, p: rtwPieces(o) })).filter((x) => x.o.sizes.length > 0);
  const piecesLeft = rtw.reduce((s, x) => s + x.p.left, 0);
  const stockValue = rtw.reduce((s, x) => s + x.p.left * x.p.priceEach, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Stock" subtitle="Fabric and materials on hand, and ready-to-wear pieces left to sell." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Materials" value={materials.length} hint={low.length ? `${low.length} running low` : "none running low"} tone={low.length ? "bad" : undefined} />
        <Stat label="RTW pieces left" value={piecesLeft} />
        <Stat label="RTW stock value" value={money(stockValue)} hint="at selling price" />
      </div>

      <Section title="Fabric & materials">
        {materials.length === 0 ? (
          <Empty>Nothing yet. Add your lining, zips, thread… below.</Empty>
        ) : (
          <ul className="divide-y divide-line/60 text-sm mb-4">
            {materials.map((m) => {
              const isLow = m.lowAt !== null && m.quantity <= m.lowAt;
              return (
                <li key={m.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-medium">{m.name}</span>
                    {isLow && <span className="ml-2"><Pill tone="red">running low</Pill></span>}
                    {m.note && <div className="text-xs text-muted">{m.note}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`tabular-nums w-24 text-right ${isLow ? "text-red-700 font-medium" : ""}`}>{qty(m.quantity)} {m.unit}</span>
                    <form className="flex gap-1">
                      <input name="by" inputMode="decimal" placeholder="Qty" className="input w-16 py-1" />
                      <button formAction={adjustMaterial.bind(null, m.id, -1)} className="btn btn-sm" title="Used some">Used</button>
                      <button formAction={adjustMaterial.bind(null, m.id, 1)} className="btn btn-sm" title="Bought more">Bought</button>
                    </form>
                    <form action={deleteMaterial.bind(null, m.id)}><ConfirmButton message={`Remove ${m.name} from stock?`} confirmLabel="Remove">×</ConfirmButton></form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <form action={addMaterial} className="grid grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <Field label="Material" className="col-span-2"><input name="name" className="input" required placeholder="e.g. Black lining" /></Field>
          <Field label="Quantity"><input name="quantity" inputMode="decimal" className="input" placeholder="0" /></Field>
          <Field label="Unit">
            <select name="unit" className="input" defaultValue="yards">{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
          </Field>
          <Field label="Warn me at"><input name="lowAt" inputMode="decimal" className="input" placeholder="e.g. 5" /></Field>
          <button className="btn-primary">Add material</button>
        </form>
      </Section>

      <Section title="Ready-to-wear pieces left">
        {rtw.length === 0 ? (
          <Empty>No ready-to-wear batches with sizes yet. Create an order “Made for: Ready-to-wear stock”, then add sizes on it.</Empty>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="table">
              <thead><tr><th>Batch</th><th>Sizes left</th><th className="text-right">Left</th><th className="text-right">Cost / piece</th><th className="text-right">Price / piece</th></tr></thead>
              <tbody>
                {rtw.map(({ o, p }) => (
                  <tr key={o.id}>
                    <td><Link href={`/orders/${o.id}`} className="link font-medium">{o.title}</Link></td>
                    <td className="text-xs">
                      {o.sizes.map((z) => (
                        <span key={z.id} className={`inline-block mr-2 ${z.made - z.sold === 0 ? "text-muted line-through" : ""}`}>{z.size}: {z.made - z.sold}</span>
                      ))}
                    </td>
                    <td className="text-right tabular-nums font-medium">{p.left} / {p.made}</td>
                    <td className="text-right tabular-nums">{money(p.costEach)}</td>
                    <td className="text-right tabular-nums">{money(p.priceEach)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
