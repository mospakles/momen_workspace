import Link from "next/link";
import { db } from "@/lib/db";
import { fmtQty, money } from "@/lib/format";
import { MATERIAL_UNITS } from "@/lib/constants";
import { rtwPieces } from "@/lib/orders";
import { addMaterial, adjustMaterial } from "@/actions/misc";
import { Empty, Field, PageHeader, Pill, Section, Stat } from "@/components/ui";
import { SearchBox } from "@/components/SearchBox";

export const dynamic = "force-dynamic";

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim();
  const [allMaterials, batches] = await Promise.all([
    db.material.findMany({ orderBy: { name: "asc" } }),
    db.order.findMany({ where: { purpose: "RTW", status: { not: "CANCELLED" } }, include: { sizes: true, costs: true }, orderBy: { orderDate: "desc" } }),
  ]);
  const isLow = (m: (typeof allMaterials)[number]) => m.lowAt !== null && m.quantity <= m.lowAt;
  const low = allMaterials.filter(isLow);
  const needle = q?.toLowerCase();
  const materialsValue = allMaterials.reduce((sum, m) => sum + Math.round(m.quantity * (m.unitPrice ?? 0)), 0);
  const unpriced = allMaterials.filter((m) => m.unitPrice === null).length;
  const materials = needle ? allMaterials.filter((m) => `${m.name} ${m.note ?? ""}`.toLowerCase().includes(needle)) : allMaterials;
  const rtw = batches.map((o) => ({ o, p: rtwPieces(o) })).filter((x) => x.o.sizes.length > 0);
  const piecesLeft = rtw.reduce((s, x) => s + x.p.left, 0);
  const stockValue = rtw.reduce((s, x) => s + x.p.left * x.p.priceEach, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Stock" subtitle="Fabric and materials on hand, and ready-to-wear pieces left to sell." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Materials" value={allMaterials.length} hint={low.length ? `${low.length} running low` : "none running low"} tone={low.length ? "bad" : undefined} />
        <Stat label="Materials value" value={money(materialsValue)} hint={unpriced ? `${unpriced} without a price yet` : "at what you paid"} />
        <Stat label="RTW pieces left" value={piecesLeft} />
        <Stat label="RTW stock value" value={money(stockValue)} hint="at selling price" />
      </div>

      <Section title="Fabric & materials" actions={q ? <span className="text-sm text-muted">{materials.length} of {allMaterials.length}</span> : undefined}>
        <SearchBox placeholder="Search materials…" className="mb-3" />
        {materials.length === 0 ? (
          <Empty>{q ? `Nothing matches “${q}”.` : "Nothing yet. Add your lining, zips, thread… below."}</Empty>
        ) : (
          <ul className="divide-y divide-line/60 text-sm mb-4">
            {materials.map((m) => {
              const low = isLow(m);
              return (
                <li key={m.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/stock/${m.id}`} className="link font-medium">{m.name}</Link>
                    {low && <span className="ml-2"><Pill tone="red">running low</Pill></span>}
                    {m.note && <div className="text-xs text-muted">{m.note}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-right text-xs text-muted tabular-nums w-28 hidden sm:block">
                      {m.unitPrice !== null ? <>{money(m.unitPrice)} each<br />{money(Math.round(m.quantity * m.unitPrice))}</> : "no price"}
                    </span>
                    <span className={`tabular-nums w-24 text-right ${low ? "text-red-700 font-medium" : ""}`}>{fmtQty(m.quantity)} {m.unit}</span>
                    <form className="flex gap-1">
                      <input name="by" inputMode="decimal" placeholder="Qty" className="input w-16 py-1" />
                      <button formAction={adjustMaterial.bind(null, m.id, -1)} className="btn btn-sm" title="Used some">Used</button>
                      <button formAction={adjustMaterial.bind(null, m.id, 1)} className="btn btn-sm" title="Bought more">Bought</button>
                    </form>
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
            <select name="unit" className="input" defaultValue="yards">{MATERIAL_UNITS.map((u) => <option key={u}>{u}</option>)}</select>
          </Field>
          <Field label="Price per unit (₦)"><input name="unitPrice" inputMode="numeric" className="input" placeholder="optional" /></Field>
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
