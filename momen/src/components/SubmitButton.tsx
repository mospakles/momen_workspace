"use client";

import { useFormStatus } from "react-dom";

/** Submit button that disables itself while the form is saving, so a double tap can't save twice. */
export function SubmitButton({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={`${className} disabled:opacity-60`} disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}
