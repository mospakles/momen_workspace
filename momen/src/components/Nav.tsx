"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today", icon: "☀︎" },
  { href: "/orders", label: "Orders", icon: "✂︎" },
  { href: "/customers", label: "Customers", icon: "☺︎" },
  { href: "/expenses", label: "Expenses", icon: "₦" },
  { href: "/workers", label: "Workers", icon: "⚒︎" },
  { href: "/stock", label: "Stock", icon: "▦" },
  { href: "/tasks", label: "To-do", icon: "✓" },
  { href: "/issues", label: "Issues", icon: "!" },
  { href: "/reports", label: "Reports", icon: "▤" },
];

// The bottom bar on phones only has room for the most-used five.
const MOBILE = ["/", "/orders", "/customers", "/expenses", "/reports"];

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      <aside className="no-print hidden md:flex md:flex-col w-56 shrink-0 border-r border-line bg-paper min-h-screen sticky top-0 p-4">
        <Link href="/" className="font-display text-2xl text-plum px-2 mb-6">
          Momen
        </Link>
        <nav className="space-y-1 flex-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                active(l.href) ? "bg-plum-soft text-plum font-medium" : "text-ink hover:bg-cream"
              }`}
            >
              <span className="w-4 text-center">{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/portfolio" target="_blank" className="text-xs px-3 mb-1 text-muted hover:text-ink">
          Public portfolio ↗
        </Link>
        <Link href="/bin" className={`text-xs px-3 mb-2 ${active("/bin") ? "text-plum font-medium" : "text-muted hover:text-ink"}`}>
          Bin (deleted items)
        </Link>
        <form action="/logout" method="post">
          <button className="text-xs text-muted hover:text-ink px-3">Log out</button>
        </form>
      </aside>

      <header className="no-print md:hidden flex items-center justify-between px-4 py-3 border-b border-line bg-paper sticky top-0 z-10">
        <Link href="/" className="font-display text-xl text-plum">
          Momen
        </Link>
        <div className="flex gap-3 text-sm">
          <Link href="/workers" className={active("/workers") ? "text-plum font-medium" : "text-muted"}>
            Workers
          </Link>
          <Link href="/tasks" className={active("/tasks") ? "text-plum font-medium" : "text-muted"}>
            To-do
          </Link>
          <Link href="/issues" className={active("/issues") ? "text-plum font-medium" : "text-muted"}>
            Issues
          </Link>
        </div>
      </header>

      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-10 bg-paper border-t border-line grid grid-cols-5">
        {LINKS.filter((l) => MOBILE.includes(l.href)).map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center py-2 text-[11px] ${active(l.href) ? "text-plum font-medium" : "text-muted"}`}
          >
            <span className="text-base leading-5">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
