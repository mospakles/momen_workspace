"use client";

import { useRef } from "react";
import { PAYMENT_METHODS } from "@/lib/constants";

/** "Mark paid" → a small window: pay everything owed in one tap, or type the amount they paid. */
export function MarkPaidButton({
  action,
  owed,
  who,
  className = "btn btn-sm",
}: {
  action: (fd: FormData) => Promise<void>;
  owed: number;
  who: string;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();
  const owedText = `₦${owed.toLocaleString("en-NG")}`;

  return (
    <form action={action}>
      <button type="button" className={className} onClick={() => dialog.current?.showModal()}>
        Mark paid
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-line bg-paper p-5 text-left text-ink shadow-xl backdrop:bg-ink/40"
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <p className="font-medium">{who} paid</p>
        <p className="text-sm text-muted">Owes {owedText}</p>
        <button name="full" value="1" className="btn-primary w-full mt-4" onClick={close}>
          Paid all {owedText}
        </button>
        <div className="text-xs text-muted text-center my-3">or part of it</div>
        <div className="grid grid-cols-2 gap-2">
          <input
            name="amount"
            inputMode="numeric"
            placeholder="Amount paid"
            className="input"
            // Enter would otherwise press the first button, "Paid all".
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              e.currentTarget.form?.querySelector<HTMLButtonElement>("button[data-save]")?.click();
            }}
          />
          <select name="method" className="input" defaultValue="Transfer">
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button
            data-save
            className="btn-primary"
            onClick={(e) => {
              const amount = e.currentTarget.form?.elements.namedItem("amount") as HTMLInputElement | null;
              if (!amount?.value.trim()) {
                e.preventDefault();
                amount?.focus();
                return;
              }
              close();
            }}
          >
            Save payment
          </button>
        </div>
      </dialog>
    </form>
  );
}
