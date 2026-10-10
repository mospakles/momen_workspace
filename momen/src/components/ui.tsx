import Link from "next/link";
import { ORDER_STATUSES, labelFor } from "@/lib/constants";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="h1">{title}</h1>
        {subtitle && <div className="text-sm text-muted mt-1">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 no-print">{actions}</div>}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-stone-100 text-stone-700",
  CUTTING: "bg-sky-100 text-sky-800",
  SEWING: "bg-indigo-100 text-indigo-800",
  FITTING: "bg-amber-100 text-amber-800",
  READY: "bg-emerald-100 text-emerald-800",
  DELIVERED: "bg-plum-soft text-plum",
  CANCELLED: "bg-red-100 text-red-700 line-through",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_COLORS[status] ?? ""}`}>
      {labelFor(ORDER_STATUSES, status)}
    </span>
  );
}

export function Pill({ children, tone = "stone" }: { children: React.ReactNode; tone?: "stone" | "red" | "green" | "amber" | "plum" }) {
  const tones = {
    stone: "bg-stone-100 text-stone-700",
    red: "bg-red-100 text-red-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    plum: "bg-plum-soft text-plum",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : "text-ink";
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className={`text-xl sm:text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </div>
  );
}

export function Section({ title, actions, children, className = "" }: { title: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="h2">{title}</h2>
        {actions && <div className="no-print">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted py-2">{children}</p>;
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Select({
  name,
  options,
  defaultValue,
  required,
  placeholder,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <select name={name} className="input" defaultValue={defaultValue ?? ""} required={required}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="no-print text-sm text-muted hover:text-ink inline-block mb-3">
      ← {children}
    </Link>
  );
}
