import Link from "next/link";
import type { Measurement } from "@prisma/client";
import { MEASUREMENT_SETS, guessMeasurementSet, setFields } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { ConfirmButton } from "./ConfirmButton";

export function MeasurementCard({
  m,
  editHref,
  deleteAction,
  compact,
}: {
  m: Measurement;
  editHref?: string;
  deleteAction?: () => Promise<void>;
  compact?: boolean;
}) {
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
        <div className="flex gap-1.5 no-print">
          {editHref && <Link href={editHref} className="btn btn-sm">Edit</Link>}
          {deleteAction && (
            <form action={deleteAction}>
              <ConfirmButton className="btn btn-sm text-red-700" message={`Delete the measurements taken on ${fmtDate(m.takenAt)}? You can restore them from the Bin for 30 days.`}>
                Delete
              </ConfirmButton>
            </form>
          )}
        </div>
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
