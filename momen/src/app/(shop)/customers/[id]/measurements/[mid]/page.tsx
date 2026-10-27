import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { guessMeasurementSet } from "@/lib/constants";
import { deleteMeasurementAndReturn, saveMeasurement } from "@/actions/customers";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MeasurementForm } from "@/components/MeasurementForm";
import { BackLink, PageHeader } from "@/components/ui";

export default async function EditMeasurementPage({ params }: { params: Promise<{ id: string; mid: string }> }) {
  const p = await params;
  const id = Number(p.id);
  const m = await db.measurement.findFirst({ where: { id: Number(p.mid), customerId: id }, include: { customer: true } });
  if (!m) notFound();
  return (
    <div>
      <BackLink href={`/customers/${id}`}>{m.customer.name}</BackLink>
      <PageHeader title="Edit measurements" />
      <MeasurementForm action={saveMeasurement.bind(null, id, m.id)} measurement={m} defaultSet={guessMeasurementSet(JSON.parse(m.values)) ?? "MALE"} />
      <form action={deleteMeasurementAndReturn.bind(null, id, m.id)} className="mt-6 no-print">
        <ConfirmButton message="Delete these measurements? You can restore them from the Bin for 30 days.">Delete measurements</ConfirmButton>
      </form>
    </div>
  );
}
