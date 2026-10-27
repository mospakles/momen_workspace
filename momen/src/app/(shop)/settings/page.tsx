import { BUSINESS_FIELDS, getBusiness } from "@/lib/settings";
import { saveBusiness } from "@/actions/misc";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, PageHeader, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

const WIDE = new Set(["name", "address", "invoiceNotes"]);

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const business = await getBusiness();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Business details" subtitle="Shown on invoices, receipts and the public portfolio." />
      {saved && <p className="card border-emerald-300 bg-emerald-50 text-sm text-emerald-800">Saved.</p>}
      <Section title="Details">
        <form action={saveBusiness} className="grid sm:grid-cols-2 gap-4">
          {BUSINESS_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} className={WIDE.has(f.key) ? "sm:col-span-2" : ""}>
              {f.key === "invoiceNotes" || f.key === "address" ? (
                <textarea name={f.key} rows={2} className="input" defaultValue={business[f.key]} />
              ) : (
                <input
                  name={f.key}
                  className="input"
                  defaultValue={business[f.key]}
                  inputMode={f.key === "accountNumber" || f.key === "invoiceDueDays" ? "numeric" : undefined}
                />
              )}
            </Field>
          ))}
          <div className="sm:col-span-2"><SubmitButton>Save details</SubmitButton></div>
        </form>
      </Section>
    </div>
  );
}
