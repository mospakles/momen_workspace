import Link from "next/link";
import type { Measurement } from "@prisma/client";
import { MEASUREMENT_SETS, guessMeasurementSet, setFields } from "@/lib/constants";
import { fmtDate } from "@/lib/format";

export function MeasurementCard({ m, editHref, compact }: { m: Measurement; editHref?: string; compact?: boolean }) {
  const values: Record<string, string> = JSON.parse(m.values);
  const set = guessMeasurementSet(values);
  // Standard ones in the order they're taken, then any extras.
  const order = set ? setFields(set) : [];
  const rank = (k: string) => (order.includes(k) ? order.indexOf(k) : order.length);
  const entries = Object.entries(values).sort((a, b) => rank(a[0]) - rank(b[0]));
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium">
          {fmtDate(m.takenAt)} <span className="text-muted font-normal">· {set ? `${MEASUREMENT_SETS[set].label} · ` : ""}{m.unit === "cm" ? "cm" : "inches"}</span>
        </div>
        {editHref && <Link href={editHref} className="link text-xs no-print">Edit</Link>}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">No values recorded.</p>
      ) : (
        <dl className={`grid gap-x-4 gap-y-1 text-sm ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
          {entries.map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-dashed border-line/70 py-0.5">
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {m.notes && <p className="text-sm text-muted mt-2 italic">{m.notes}</p>}
    </div>
  );
}
