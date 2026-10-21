"use client";

import { useState } from "react";

const OTHER = "__other";

/** A dropdown of suggestions with an "Other…" choice that lets you type your own value. */
export function SelectOrOther({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string | null;
}) {
  const [choice, setChoice] = useState(defaultValue ?? options[0]?.value ?? OTHER);
  const [custom, setCustom] = useState("");
  const other = choice === OTHER;

  return (
    <>
      <select className="input" value={choice} onChange={(e) => setChoice(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value={OTHER}>Other (type your own)…</option>
      </select>
      {other && <input className="input mt-2" placeholder="Type it here" value={custom} onChange={(e) => setCustom(e.target.value)} required autoFocus />}
      <input type="hidden" name={name} value={other ? custom : choice} />
    </>
  );
}
