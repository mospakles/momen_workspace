"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Search that updates the results as you type (and on Enter / Search), keeping the page's other filters. */
export function SearchBox({ placeholder, className = "" }: { placeholder: string; className?: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = (q: string) => {
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${path}?${qs}` : path, { scroll: false }));
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <form
      role="search"
      className={`flex gap-2 max-w-md ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        go(value);
      }}
    >
      <input
        name="q"
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => go(e.target.value), 300);
        }}
        placeholder={placeholder}
        className="input"
        autoComplete="off"
      />
      <button className="btn">{pending ? "…" : "Search"}</button>
      {value && (
        <button type="button" className="btn" onClick={() => { setValue(""); go(""); }}>
          Clear
        </button>
      )}
    </form>
  );
}
