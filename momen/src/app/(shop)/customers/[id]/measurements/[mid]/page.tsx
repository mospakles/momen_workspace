import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { guessMeasurementSet } from "@/lib/constants";
import { saveMeasurement } from "@/actions/customers";
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
    </div>
  );
}
