import Link from "next/link";
import { monthLabel, shiftMonth } from "@/lib/format";

export function MonthPicker({ month, basePath }: { month: string; basePath: string }) {
  return (
    <div className="flex items-center gap-2 no-print">
      <Link href={`${basePath}?month=${shiftMonth(month, -1)}`} className="btn btn-sm">←</Link>
      <form action={basePath}>
        <input type="month" name="month" defaultValue={month} className="input py-1" />
      </form>
      <Link href={`${basePath}?month=${shiftMonth(month, 1)}`} className="btn btn-sm">→</Link>
      <span className="hidden sm:inline text-sm text-muted">{monthLabel(month)}</span>
    </div>
  );
}
