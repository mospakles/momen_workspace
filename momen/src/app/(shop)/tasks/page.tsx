import { db } from "@/lib/db";
import { orderWho } from "@/lib/orders";
import { OPEN_STATUSES } from "@/lib/constants";
import { addDays, startOfDay, toInputDate } from "@/lib/format";
import { addTask } from "@/actions/misc";
import { TaskList } from "@/components/TaskList";
import { PageHeader, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const today = startOfDay();
  const weekAgo = addDays(today, -7);
  const [open, done, orders] = await Promise.all([
    db.task.findMany({ where: { done: false }, include: { order: { include: { customer: true } } }, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] }),
    db.task.findMany({ where: { done: true, doneAt: { gte: weekAgo } }, include: { order: { include: { customer: true } } }, orderBy: { doneAt: "desc" } }),
    db.order.findMany({ where: { status: { in: OPEN_STATUSES } }, include: { customer: true }, orderBy: { dueDate: "asc" } }),
  ]);

  const overdueOrToday = open.filter((t) => t.dueDate && t.dueDate < addDays(today, 1));
  const later = open.filter((t) => t.dueDate && t.dueDate >= addDays(today, 1));
  const someday = open.filter((t) => !t.dueDate);

  return (
    <div className="space-y-6">
      <PageHeader title="To-do" />
      <Section title="Add task">
        <form action={addTask} className="grid sm:grid-cols-6 gap-2">
          <input name="title" placeholder="What needs doing?" className="input sm:col-span-3" required />
          <input name="dueDate" type="date" className="input" defaultValue={toInputDate(today)} />
          <select name="orderId" className="input" defaultValue="">
            <option value="">Not linked to an order</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{orderWho(o)} · {o.title}</option>)}
          </select>
          <button className="btn-primary">Add</button>
        </form>
      </Section>
      <div className="grid lg:grid-cols-3 gap-6">
        <Section title="Today & overdue"><TaskList tasks={overdueOrToday} /></Section>
        <Section title="Coming up"><TaskList tasks={later} /></Section>
        <Section title="Anytime"><TaskList tasks={someday} /></Section>
      </div>
      {done.length > 0 && <Section title="Done this week"><TaskList tasks={done} /></Section>}
    </div>
  );
}
