import Link from "next/link";
import { orderWho } from "@/lib/orders";
import type { Customer, Order, Task } from "@prisma/client";
import { deleteTask, toggleTask } from "@/actions/misc";
import { daysUntil, fmtShortDate } from "@/lib/format";
import { Empty } from "./ui";

type T = Task & { order: (Order & { customer: Customer | null }) | null };

export function TaskList({ tasks, showOrder = true }: { tasks: T[]; showOrder?: boolean }) {
  if (tasks.length === 0) return <Empty>Nothing on the list. 🎉</Empty>;
  return (
    <ul className="divide-y divide-line/60">
      {tasks.map((t) => {
        const late = !t.done && t.dueDate && daysUntil(t.dueDate) < 0;
        return (
          <li key={t.id} className="py-2 flex items-start gap-3">
            <form action={toggleTask.bind(null, t.id, !t.done)}>
              <button
                aria-label={t.done ? "Mark not done" : "Mark done"}
                className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center text-xs ${t.done ? "bg-plum border-plum text-white" : "border-line bg-white hover:border-plum"}`}
              >
                {t.done ? "✓" : ""}
              </button>
            </form>
            <div className="flex-1 min-w-0">
              <div className={t.done ? "line-through text-muted" : ""}>{t.title}</div>
              <div className="text-xs text-muted flex gap-2 flex-wrap">
                {t.dueDate && <span className={late ? "text-red-700 font-medium" : ""}>{fmtShortDate(t.dueDate)}</span>}
                {showOrder && t.order && (
                  <Link href={`/orders/${t.order.id}`} className="link">
                    {orderWho(t.order)} · {t.order.title}
                  </Link>
                )}
              </div>
            </div>
            <form action={deleteTask.bind(null, t.id)}>
              <button className="text-muted hover:text-red-700 text-sm" aria-label="Delete task">×</button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
