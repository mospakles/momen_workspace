import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MATERIAL_UNITS } from "@/lib/constants";
import { fmtDate, fmtQty } from "@/lib/format";
import { adjustMaterial, deleteMaterial, updateMaterial } from "@/actions/misc";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SubmitButton } from "@/components/SubmitButton";
import { BackLink, Empty, Field, PageHeader, Pill, Section, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const m = await db.material.findUnique({ where: { id }, include: { moves: { orderBy: { createdAt: "desc" }, take: 50 } } });
  if (!m) notFound();
  const low = m.lowAt !== null && m.quantity <= m.lowAt;
  // Keep a unit typed in elsewhere selectable.
  const units = MATERIAL_UNITS.includes(m.unit) ? MATERIAL_UNITS : [...MATERIAL_UNITS, m.unit];

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/stock">Stock</BackLink>
        <PageHeader title={m.name} subtitle={m.note ?? undefined} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat label="On hand" value={`${fmtQty(m.quantity)} ${m.unit}`} tone={low ? "bad" : undefined} hint={low ? "running low" : undefined} />
        <Stat label="Warn me at" value={m.lowAt !== null ? `${fmtQty(m.lowAt)} ${m.unit}` : "—"} />
        <Stat label="Last changed" value={<span className="text-base">{fmtDate(m.updatedAt)}</span>} />
      </div>

      <Section title="Used or bought some">
        <form className="grid grid-cols-2 sm:grid-cols-[10rem_1fr_auto_auto] gap-2">
          <input name="by" inputMode="decimal" placeholder={`How many ${m.unit}`} className="input col-span-2 sm:col-span-1" required />
          <input name="why" placeholder="What for (optional), e.g. Agbada for Tunde" className="input col-span-2 sm:col-span-1" />
          <button formAction={adjustMaterial.bind(null, id, -1)} className="btn">Used</button>
          <button formAction={adjustMaterial.bind(null, id, 1)} className="btn-primary">Bought</button>
        </form>
      </Section>

      <Section title="Edit">
        <form action={updateMaterial.bind(null, id)} className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <Field label="Name" className="col-span-2"><input name="name" className="input" required defaultValue={m.name} /></Field>
          <Field label="Quantity"><input name="quantity" inputMode="decimal" className="input" defaultValue={fmtQty(m.quantity)} /></Field>
          <Field label="Unit">
            <select name="unit" className="input" defaultValue={m.unit}>{units.map((u) => <option key={u}>{u}</option>)}</select>
          </Field>
          <Field label="Warn me at"><input name="lowAt" inputMode="decimal" className="input" placeholder="blank = never" defaultValue={m.lowAt !== null ? fmtQty(m.lowAt) : ""} /></Field>
          <Field label="Note" className="col-span-2 lg:col-span-3"><input name="note" className="input" placeholder="e.g. colour, where it's kept, supplier" defaultValue={m.note ?? ""} /></Field>
          <div className="col-span-2 lg:col-span-4"><SubmitButton>Save changes</SubmitButton></div>
        </form>
        <p className="text-xs text-muted mt-2">Changing the quantity here is recorded as a stock-count correction.</p>
      </Section>

      <Section title="History">
        {m.moves.length === 0 ? (
          <Empty>No changes recorded yet.</Empty>
        ) : (
          <ul className="divide-y divide-line/60 text-sm">
            {m.moves.map((mv) => (
              <li key={mv.id} className="py-2 flex justify-between gap-3">
                <div>
                  <span className="text-muted">{fmtDate(mv.createdAt)} · {mv.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  {mv.note && <span> · {mv.note}</span>}
                </div>
                <div className="text-right tabular-nums whitespace-nowrap">
                  <Pill tone={mv.change >= 0 ? "green" : "amber"}>{mv.change >= 0 ? "+" : "−"}{fmtQty(Math.abs(mv.change))}</Pill>
                  <span className="text-muted ml-2">→ {fmtQty(mv.after)} {m.unit}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <form action={deleteMaterial.bind(null, id)}>
        <ConfirmButton message={`Remove ${m.name} from stock? Its history goes too.`} confirmLabel="Remove">Remove from stock</ConfirmButton>
      </form>
    </div>
  );
}
