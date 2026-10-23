import Link from "next/link";
import { db } from "@/lib/db";
import { EXPENSE_CATEGORIES, ORDER_COST_CATEGORIES, ORDER_PURPOSES, labelFor } from "@/lib/constants";
import { currentMonth, fmtDate, fmtShortDate, money, monthLabel, shiftMonth } from "@/lib/format";
import { deliveryDelta, orderTotals, orderWho } from "@/lib/orders";
import { bigBuysPayback, monthSummary, outfitTypes } from "@/lib/reports";
import { applyRecurring } from "@/lib/recurring";
import { blobBackupsEnabled, listBackups } from "@/lib/backup";
import { MonthPicker } from "@/components/MonthPicker";
import { PrintButton } from "@/components/PrintButton";
import { Empty, PageHeader, Pill, Section, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

function Row({ label, value, bold, indent, tone }: { label: string; value: number; bold?: boolean; indent?: boolean; tone?: boolean }) {
  const color = tone ? (value >= 0 ? "text-emerald-700" : "text-red-700") : "";
  return (
    <div className={`flex justify-between py-1.5 ${bold ? "font-semibold border-t border-line mt-1 pt-2" : ""} ${indent ? "pl-4 text-muted text-sm" : ""}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${color}`}>{money(value)}</span>
    </div>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = (await searchParams).month || currentMonth();
  await applyRecurring();
  const [types, payback] = await Promise.all([outfitTypes(), bigBuysPayback()]);
  const s = await monthSummary(month);

  // Last 12 months trend
  const months = Array.from({ length: 12 }, (_, i) => shiftMonth(month, i - 11));
  const trend = await Promise.all(months.map(async (m) => ({ m, ...(await monthSummary(m)) })));
  const maxBar = Math.max(1, ...trend.map((t) => Math.max(t.income, t.directCosts + t.operatingTotal)));

  // Money owed right now
  const open = await db.order.findMany({ where: { status: { not: "CANCELLED" } }, include: { payments: true, costs: true, customer: true } });
  const debtors = open.map((o) => ({ o, t: orderTotals(o) })).filter((x) => x.t.balance > 0).sort((a, b) => b.t.balance - a.t.balance);
  const owed = debtors.reduce((sum, x) => sum + x.t.balance, 0);

  // Saved daily by the cron; a failure to list them shouldn't break the report.
  const backups = blobBackupsEnabled() ? (await listBackups().catch(() => [])).slice(0, 7) : [];

  const deliveredStats = s.delivered.map((o) => ({ o, t: orderTotals(o), d: deliveryDelta(o) }));
  const early = deliveredStats.filter((x) => x.d !== null && x.d > 0).length;
  const late = deliveredStats.filter((x) => x.d !== null && x.d < 0).length;
  const onTime = deliveredStats.filter((x) => x.d === 0).length;
  const deliveredRevenue = deliveredStats.reduce((sum, x) => sum + x.o.price, 0);
  const deliveredCost = deliveredStats.reduce((sum, x) => sum + x.t.cost, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Monthly statement" subtitle={monthLabel(month)} actions={<><MonthPicker month={month} basePath="/reports" /><PrintButton /></>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Money in" value={money(s.income)} hint="payments received" />
        <Stat label="Money out" value={money(s.directCosts + s.operatingTotal + s.capitalTotal)} hint="costs + expenses + big buys" />
        <Stat label="Net profit" value={money(s.netProfit)} tone={s.netProfit >= 0 ? "good" : "bad"} hint="before big buys" />
        <Stat label="New orders" value={s.bookedCount} hint={`worth ${money(s.bookedValue)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Profit & loss">
          <Row label="Income (payments received)" value={s.income} bold />
          {s.paymentsByMethod.map(([k, v]) => <Row key={k} label={k} value={v} indent />)}

          <Row label="Cost of making outfits" value={-s.directCosts} bold />
          {s.costsByCategory.map(([k, v]) => <Row key={k} label={labelFor(ORDER_COST_CATEGORIES, k)} value={-v} indent />)}
          {s.inHouseByPurpose.length > 0 && (
            <div className="mt-2 rounded-lg bg-cream px-3 py-1">
              <div className="label mt-1 mb-0">Of which in-house work</div>
              {s.inHouseByPurpose.map(([k, v]) => <Row key={k} label={labelFor(ORDER_PURPOSES, k)} value={-v} indent />)}
            </div>
          )}

          <Row label="Gross profit" value={s.grossProfit} bold tone />

          <Row label="Shop running expenses" value={-s.operatingTotal} bold />
          {s.operatingByCategory.map(([k, v]) => <Row key={k} label={labelFor(EXPENSE_CATEGORIES, k)} value={-v} indent />)}

          <div className="bg-plum-soft rounded-lg px-3 -mx-1 mt-2">
            <Row label="Net profit" value={s.netProfit} bold tone />
          </div>

          <Row label="Big buys (equipment)" value={-s.capitalTotal} bold />
          {s.capital.map((e) => <Row key={e.id} label={e.description} value={-e.amount} indent />)}
          <Row label="Cash left after big buys" value={s.cashAfterBigBuys} bold tone />
          <p className="text-xs text-muted mt-3">
            Income counts money actually received this month (deposits and balances). Costs are what you paid this month for tailor, embroidery, buttonholes, fabric etc. Big buys are kept separate so one machine purchase doesn&apos;t make a good month look like a loss.
          </p>
        </Section>

        <div className="space-y-6">
          <Section title={`Delivered this month (${s.delivered.length})`}>
            {s.delivered.length === 0 ? (
              <Empty>No deliveries recorded this month.</Empty>
            ) : (
              <>
                <div className="flex gap-2 mb-3 flex-wrap">
                  <Pill tone="green">{early} early</Pill>
                  <Pill tone="plum">{onTime} on time</Pill>
                  <Pill tone="red">{late} late</Pill>
                </div>
                <div className="overflow-x-auto -mx-4">
                  <table className="table">
                    <thead><tr><th>Order</th><th>Delivered</th><th className="text-right">Price</th><th className="text-right">Cost</th><th className="text-right">Profit</th></tr></thead>
                    <tbody>
                      {deliveredStats.map(({ o, t, d }) => (
                        <tr key={o.id}>
                          <td><Link href={`/orders/${o.id}`} className="link">{orderWho(o)}</Link><div className="text-xs text-muted">{o.title}</div></td>
                          <td className="whitespace-nowrap">
                            {fmtShortDate(o.deliveredAt)}
                            {d !== null && d !== 0 && <div className={`text-xs ${d > 0 ? "text-emerald-700" : "text-red-700"}`}>{d > 0 ? `${d}d early` : `${-d}d late`}</div>}
                          </td>
                          <td className="text-right tabular-nums">{money(o.price)}</td>
                          <td className="text-right tabular-nums text-muted">{money(t.cost)}</td>
                          <td className={`text-right tabular-nums ${t.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{money(t.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td className="px-3 py-2" colSpan={2}>Total</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(deliveredRevenue)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(deliveredCost)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(deliveredRevenue - deliveredCost)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {deliveredRevenue > 0 && (
                  <p className="text-xs text-muted mt-2">
                    Average profit per outfit: {money(Math.round((deliveredRevenue - deliveredCost) / s.delivered.length))} · margin {Math.round(((deliveredRevenue - deliveredCost) / deliveredRevenue) * 100)}%
                  </p>
                )}
              </>
            )}
          </Section>

          <Section title={`Customers owing you · ${money(owed)}`}>
            {debtors.length === 0 ? (
              <Empty>Nobody owes you. 🎉</Empty>
            ) : (
              <ul className="divide-y divide-line/60 text-sm">
                {debtors.slice(0, 15).map(({ o, t }) => (
                  <li key={o.id} className="py-1.5 flex justify-between gap-2">
                    <Link href={`/orders/${o.id}`} className="link">{orderWho(o)} <span className="text-muted">· {o.title}</span></Link>
                    <span className="tabular-nums text-red-700">{money(t.balance)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {payback && (
        <Section title="Big buys paid back">
          <div className="flex justify-between text-sm mb-1">
            <span>Profit since {fmtDate(payback.since)}: <span className="font-medium tabular-nums">{money(payback.profit)}</span></span>
            <span>Spent on machines & equipment: <span className="font-medium tabular-nums">{money(payback.spent)}</span></span>
          </div>
          <div className="h-3 bg-cream rounded-full overflow-hidden border border-line">
            <div className="h-full bg-emerald-600" style={{ width: `${payback.share * 100}%` }} />
          </div>
          <p className="text-sm mt-2">
            <span className="font-semibold">{Math.round(payback.share * 100)}% paid back.</span>{" "}
            <span className="text-muted">
              {payback.share >= 1 ? "Your equipment has fully paid for itself." : `${money(payback.spent - Math.max(0, payback.profit))} of profit still to go.`}
            </span>
          </p>
        </Section>
      )}

      <Section title="Profit by outfit type">
        <p className="text-sm text-muted mb-2">Delivered customer orders from the last 12 months. Use it as a pricing guide: low-margin styles may be underpriced.</p>
        {types.length === 0 ? (
          <Empty>No delivered orders yet.</Empty>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="table">
              <thead><tr><th>Outfit</th><th className="text-right">Made</th><th className="text-right">Avg price</th><th className="text-right">Avg cost</th><th className="text-right">Avg profit</th><th className="text-right">Margin</th></tr></thead>
              <tbody>
                {types.slice(0, 20).map((g) => (
                  <tr key={g.name}>
                    <td className="font-medium">{g.name}</td>
                    <td className="text-right tabular-nums">{g.count}</td>
                    <td className="text-right tabular-nums">{money(g.avgPrice)}</td>
                    <td className="text-right tabular-nums text-muted">{money(g.avgCost)}</td>
                    <td className={`text-right tabular-nums ${g.avgProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{money(g.avgProfit)}</td>
                    <td className="text-right tabular-nums">
                      {Math.round(g.margin * 100)}%{g.margin < 0.3 && <span className="ml-1"><Pill tone="amber">low</Pill></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Last 12 months">
        <div className="overflow-x-auto -mx-4">
          <table className="table">
            <thead>
              <tr><th>Month</th><th className="text-right">Income</th><th className="text-right">Costs</th><th className="text-right">Expenses</th><th className="text-right">Net profit</th><th className="text-right">Big buys</th><th className="w-1/4 hidden sm:table-cell" /></tr>
            </thead>
            <tbody>
              {trend.map((t) => (
                <tr key={t.m} className={t.m === month ? "bg-plum-soft/50" : ""}>
                  <td className="whitespace-nowrap"><Link href={`/reports?month=${t.m}`} className="link">{monthLabel(t.m)}</Link></td>
                  <td className="text-right tabular-nums">{money(t.income)}</td>
                  <td className="text-right tabular-nums text-muted">{money(t.directCosts)}</td>
                  <td className="text-right tabular-nums text-muted">{money(t.operatingTotal)}</td>
                  <td className={`text-right tabular-nums font-medium ${t.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{money(t.netProfit)}</td>
                  <td className="text-right tabular-nums text-muted">{t.capitalTotal ? money(t.capitalTotal) : "—"}</td>
                  <td className="hidden sm:table-cell">
                    <div className="h-2 bg-emerald-600/80 rounded" style={{ width: `${(t.income / maxBar) * 100}%` }} title="Income" />
                    <div className="h-2 bg-red-400/80 rounded mt-0.5" style={{ width: `${((t.directCosts + t.operatingTotal) / maxBar) * 100}%` }} title="Costs + expenses" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="px-3 py-2">12-month total</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(trend.reduce((a, t) => a + t.income, 0))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(trend.reduce((a, t) => a + t.directCosts, 0))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(trend.reduce((a, t) => a + t.operatingTotal, 0))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(trend.reduce((a, t) => a + t.netProfit, 0))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(trend.reduce((a, t) => a + t.capitalTotal, 0))}</td>
                <td className="hidden sm:table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      <Section title="Backups" className="no-print" actions={<a href="/api/backup" className="btn btn-sm">Download backup now</a>}>
        <p className="text-sm text-muted mb-2">
          A copy of everything (customers, orders, payments, expenses…) is saved automatically every night and kept for 30 days.
          Download one now and then and keep it somewhere safe, like Google Drive.
        </p>
        {backups.length === 0 ? (
          <Empty>No automatic backups yet. The first one runs tonight.</Empty>
        ) : (
          <ul className="text-sm divide-y divide-line/60">
            {backups.map((b) => (
              <li key={b.pathname} className="py-1.5 flex justify-between">
                <span>{fmtDate(b.uploadedAt)} · {b.uploadedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                <a href={`/api/backup?file=${encodeURIComponent(b.pathname)}`} className="link">Download</a>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
