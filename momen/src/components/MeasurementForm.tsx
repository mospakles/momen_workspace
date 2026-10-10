import type { Measurement } from "@prisma/client";
import { MEASUREMENT_FIELDS } from "@/lib/constants";
import { toInputDate } from "@/lib/format";
import { Field } from "./ui";

export function MeasurementForm({ action, measurement }: { action: (fd: FormData) => Promise<void>; measurement?: Measurement }) {
  const values: Record<string, string> = measurement ? JSON.parse(measurement.values) : {};
  const standard = new Set<string>(MEASUREMENT_FIELDS);
  const custom = Object.entries(values).filter(([k]) => !standard.has(k));
  // Always offer a few empty rows for extra measurements.
  const customRows = [...custom, ...Array.from({ length: 4 }, () => ["", ""] as [string, string])];

  return (
    <form action={action} className="card space-y-5 max-w-3xl">
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <Field label="Date taken">
          <input name="takenAt" type="date" className="input" defaultValue={toInputDate(measurement?.takenAt ?? new Date())} />
        </Field>
        <Field label="Unit">
          <select name="unit" className="input" defaultValue={measurement?.unit ?? "in"}>
            <option value="in">inches</option>
            <option value="cm">cm</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {MEASUREMENT_FIELDS.map((f) => (
          <Field key={f} label={f}>
            <input name={`m:${f}`} inputMode="decimal" className="input" defaultValue={values[f] ?? ""} />
          </Field>
        ))}
      </div>

      <div>
        <div className="label">Other measurements</div>
        <div className="space-y-2">
          {customRows.map(([k, v], i) => (
            <div key={i} className="grid grid-cols-2 gap-2 max-w-md">
              <input name="customName" placeholder="Name e.g. Armhole" className="input" defaultValue={k} />
              <input name="customValue" placeholder="Value" className="input" defaultValue={v} />
            </div>
          ))}
        </div>
      </div>

      <Field label="Notes (posture, figure, things to adjust)">
        <textarea name="notes" rows={3} className="input" defaultValue={measurement?.notes ?? ""} />
      </Field>

      <button className="btn-primary">Save measurements</button>
    </form>
  );
}
