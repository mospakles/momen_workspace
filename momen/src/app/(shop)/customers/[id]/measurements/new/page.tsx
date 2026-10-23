import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { guessMeasurementSet } from "@/lib/constants";
import { saveMeasurement } from "@/actions/customers";
import { MeasurementForm } from "@/components/MeasurementForm";
import { BackLink, PageHeader } from "@/components/ui";

export default async function NewMeasurementPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) notFound();
  // Start from their latest measurements so only changes need typing.
  const latest = await db.measurement.findFirst({ where: { customerId: id }, orderBy: { takenAt: "desc" } });
  return (
    <div>
      <BackLink href={`/customers/${id}`}>{customer.name}</BackLink>
      <PageHeader title="New measurements" subtitle={latest ? "Pre-filled from their last measurements — just update what changed." : undefined} />
      <MeasurementForm
        action={saveMeasurement.bind(null, id, null)}
        measurement={latest ? { ...latest, takenAt: new Date(), notes: null } : undefined}
        defaultSet={(latest && guessMeasurementSet(JSON.parse(latest.values))) || "MALE"}
      />
    </div>
  );
}
