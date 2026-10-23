"use client";

import { useState } from "react";
import type { Measurement } from "@prisma/client";
import { MEASUREMENT_SETS, type MeasurementSet, setFields } from "@/lib/constants";
import { toInputDate } from "@/lib/format";
import { Field } from "./ui";
import { SubmitButton } from "./SubmitButton";

export function MeasurementForm({
  action,
  measurement,
  defaultSet = "MALE",
}: {
  action: (fd: FormData) => Promise<void>;
  measurement?: Measurement;
  defaultSet?: MeasurementSet;
}) {
  const values: Record<string, string> = measurement ? JSON.parse(measurement.values) : {};
  const [set, setSet] = useState<MeasurementSet>(defaultSet);
  // Anything not in the chosen set (including the other set's names) shows as an extra row.
  const standard = new Set(setFields(set));
  const custom = Object.entries(values).filter(([k]) => !standard.has(k));
  // Always offer a few empty rows for extra measurements.
  const customRows = [...custom, ...Array.from({ length: 4 }, () => ["", ""] as [string, string])];

  return (
    <form action={action} className="card space-y-5 max-w-3xl">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <span className="label">For</span>
          <div className="inline-flex rounded-lg border border-line overflow-hidden">
            {(Object.keys(MEASUREMENT_SETS) as MeasurementSet[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSet(s)}
                className={`px-4 py-2 text-sm ${set === s ? "bg-plum text-white font-medium" : "bg-white text-ink hover:bg-cream"}`}
              >
                {MEASUREMENT_SETS[s].label}
              </button>
            ))}
          </div>
        </div>
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

      {MEASUREMENT_SETS[set].groups.map((g) => (
        <fieldset key={`${set}-${g.title}`}>
          <legend className="h2 text-base mb-2">{g.title}</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {g.fields.map((f) => (
              <Field key={f} label={f}>
                <input name={`m:${f}`} inputMode="decimal" className="input" defaultValue={values[f] ?? ""} />
              </Field>
            ))}
          </div>
        </fieldset>
      ))}

      <div>
        <div className="label">Other measurements</div>
        <div className="space-y-2">
          {customRows.map(([k, v], i) => (
            <div key={`${set}-${i}`} className="grid grid-cols-2 gap-2 max-w-md">
              <input name="customName" placeholder="Name e.g. Back width" className="input" defaultValue={k} />
              <input name="customValue" placeholder="Value" className="input" defaultValue={v} />
            </div>
          ))}
        </div>
      </div>

      <Field label="Notes (posture, figure, things to adjust)">
        <textarea name="notes" rows={3} className="input" defaultValue={measurement?.notes ?? ""} />
      </Field>

      <SubmitButton>Save measurements</SubmitButton>
    </form>
  );
}
